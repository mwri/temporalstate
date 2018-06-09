'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bintrees = require('bintrees');

var _bintrees2 = _interopRequireDefault(_bintrees);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var temporalstate = function (_event_emitter) {
    _inherits(temporalstate, _event_emitter);

    function temporalstate() {
        var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, temporalstate);

        var _this = _possibleConstructorReturn(this, (temporalstate.__proto__ || Object.getPrototypeOf(temporalstate)).call(this));

        _this._states = {};
        _this._txn = [];
        _this._valeqf = params.valeqf ? params.valeqf : temporalstate.change_valeqf;

        return _this;
    }

    _createClass(temporalstate, [{
        key: 'change_list',
        value: function change_list() {

            var changes = [];
            var states = this._states;

            var val_iter_grp = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return [i.next(), i];
            }).sort(function (a, b) {
                return temporalstate.change_cmp(a[0], b[0]);
            });
            while (val_iter_grp.length > 0) {
                var v = val_iter_grp[0][0];
                var i = val_iter_grp[0][1];
                changes.push(v);
                val_iter_grp[0] = [i.next(), i];
                val_iter_grp = val_iter_grp.filter(function (a) {
                    return a[0] !== null;
                }).sort(function (a, b) {
                    return temporalstate.change_cmp(a[0], b[0]);
                });
            }

            return changes;
        }
    }, {
        key: 'txn',
        value: function txn(id, descr, fun) {

            var txn_stack = this._txn;

            txn_stack.push({
                'id': id,
                'descr': descr
            });

            this.emit('txn_start', id, descr, txn_stack);
            fun();
            this.emit('txn_end', id, descr, txn_stack);

            txn_stack.pop();
        }
    }, {
        key: 'add_change',
        value: function add_change(change) {

            var states = this._states;
            var valeqf = this._valeqf;

            var st_name = change.name;
            var st_val = change.val;
            var ts = change.timestamp;

            if (states[st_name] === undefined) this._priv_add_state(st_name);

            var state = states[st_name];
            var iter = state.upperBound(change);
            var next = iter.data();
            var cur = iter.prev();

            var txn_descr = [];
            var txn_funs = [];

            if (cur === null) {
                if (st_val !== null) {
                    txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                    txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                    if (next !== null && valeqf(next.val, st_val)) {
                        txn_descr.push({ 'rm': next });
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                }
            } else if (cur.timestamp === ts) {
                if (!valeqf(cur.val, st_val)) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) {
                            txn_descr.push({ 'remove': cur });
                            txn_funs.push(this._priv_change_remove.bind(this, cur));
                        } else {
                            txn_descr.push({ 'change': cur, 'new_val': st_val });
                            txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                        }
                        if (next !== null && valeqf(next.val, st_val)) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else if (valeqf(prev.val, st_val)) {
                        txn_descr.push({ 'remove': cur });
                        txn_funs.push(this._priv_change_remove.bind(this, cur));
                        if (next !== null && valeqf(next.val, st_val)) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else {
                        txn_descr.push({ 'change': cur, 'new_val': st_val });
                        txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                    }
                }
            } else if (!valeqf(cur.val, st_val)) {
                txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                if (next !== null && valeqf(next.val, st_val)) {
                    txn_descr.push({ 'rm': next });
                    txn_funs.push(this._priv_change_remove.bind(this, next));
                }
            }

            this.txn({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } }, txn_descr, function () {
                txn_funs.forEach(function (f) {
                    return f();
                });
            });
        }
    }, {
        key: 'remove_change',
        value: function remove_change(change) {

            var states = this._states;
            var valeqf = this._valeqf;
            var state = states[change.name];

            if (state === undefined) return;

            var v = state.find(change);
            if (v !== null && !valeqf(v.val, change.val)) return;

            this.emit('txn_start', { 'remove': change }, [{ 'remove': change }]);
            this._priv_change_remove(change);
            this.emit('txn_end', { 'remove': change }, [{ 'remove': change }]);
        }
    }, {
        key: 'var_list',
        value: function var_list() {

            return Object.keys(this._states).sort();
        }
    }, {
        key: 'first',
        value: function first(st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.iterator().next();
            }

            var first_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return i.next();
            }).sort(temporalstate.change_cmp);
            if (first_val_changes.length === 0) return null;
            var earliest_timestamp = first_val_changes[0].timestamp;
            return first_val_changes.filter(function (change) {
                return change.timestamp === earliest_timestamp;
            });
        }
    }, {
        key: 'last',
        value: function last(st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.iterator().prev();
            }

            var last_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return i.prev();
            }).sort(temporalstate.change_cmp);
            if (last_val_changes.length === 0) return null;
            var oldest_timestamp = last_val_changes[last_val_changes.length - 1].timestamp;
            return last_val_changes.filter(function (change) {
                return change.timestamp === oldest_timestamp;
            });
        }
    }, {
        key: 'next',
        value: function next(current, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.upperBound(current).data();
            }

            var next_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].upperBound(current);
            }).map(function (i) {
                while (i.data() !== null && i.data().timestamp === current.timestamp) {
                    i.next();
                }return i.data();
            }).filter(function (change) {
                return change !== null;
            }).sort(temporalstate.change_cmp);
            if (next_val_changes.length === 0) return null;
            var next_timestamp = next_val_changes[0].timestamp;
            return next_val_changes.filter(function (change) {
                return change.timestamp === next_timestamp;
            });
        }
    }, {
        key: 'prev',
        value: function prev(current, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                var iter = state.lowerBound(current);
                return iter.prev();
            }

            var prev_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].lowerBound(current);
            }).map(function (i) {
                do {
                    i.prev();
                } while (i.data() !== null && i.data().timestamp === current.timestamp);
                return i.data();
            }).filter(function (change) {
                return change !== null;
            }).sort(temporalstate.change_cmp);
            if (prev_val_changes.length === 0) return null;
            var prev_timestamp = prev_val_changes[prev_val_changes.length - 1].timestamp;
            return prev_val_changes.filter(function (change) {
                return change.timestamp === prev_timestamp;
            });
        }
    }, {
        key: 'at',
        value: function at(timestamp) {

            var states = this._states;

            return Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].find({ 'timestamp': timestamp });
            }).filter(function (v) {
                return v !== null;
            }).sort(temporalstate.change_cmp);
        }
    }, {
        key: 'after',
        value: function after(timestamp) {

            return this.next({ 'timestamp': timestamp });
        }
    }, {
        key: 'before',
        value: function before(timestamp) {

            return this.prev({ 'timestamp': timestamp });
        }
    }, {
        key: 'state',
        value: function state(ts, st_name) {
            var _this2 = this;

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined) return null;
                var iter = state.upperBound({ timestamp: ts });
                var rec = iter.prev();
                return rec === null ? null : rec.val;
            }

            return Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).reduce(function (acc, sn) {
                var rec = _this2.state(ts, sn);
                if (rec !== null) acc[sn] = rec;
                return acc;
            }, {});
        }
    }, {
        key: 'state_detail',
        value: function state_detail(ts, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined) return { 'from': null, 'to': null };
                var iter = state.upperBound({ timestamp: ts });
                var next_rec = iter.data();
                var cur_rec = iter.prev();
                if (cur_rec === null && next_rec === null) return null;
                return {
                    'from': cur_rec,
                    'to': next_rec
                };
            }

            return Object.keys(states).sort().reduce(function (acc, sn) {
                var state = states[sn];
                var iter = state.upperBound({ timestamp: ts });
                var next_rec = iter.data();
                var cur_rec = iter.prev();
                if (cur_rec !== null || next_rec !== null) acc.push({
                    'from': cur_rec,
                    'to': next_rec
                });
                return acc;
            }, []);
        }
    }, {
        key: 'between',
        value: function between(from_ts, to_ts, greedy, st_name) {

            var states = this._states;

            if (greedy === undefined) greedy = false;

            var st_names = st_name === undefined ? this.var_list() : [st_name];

            var changes = [];
            for (var i = 0; i < st_names.length; i++) {
                var state = states[st_names[i]];
                var iter = state.upperBound({ timestamp: from_ts });
                var cur_rec = iter.prev();
                if (cur_rec !== null && (greedy || cur_rec.timestamp === from_ts)) changes.push(cur_rec);
                while ((cur_rec = iter.next()) && cur_rec.timestamp <= to_ts) {
                    changes.push(cur_rec);
                }
            }

            return changes.sort(temporalstate.change_cmp);
        }
    }, {
        key: 'remove_var',
        value: function remove_var(var_name) {

            var states = this._states;
            var state = states[var_name];

            if (state && state.size === 0) {
                delete states[var_name];
                return true;
            }

            return false;
        }
    }, {
        key: '_priv_add_state',
        value: function _priv_add_state(st_name) {

            this.emit('new_var', st_name);
            this._states[st_name] = new _bintrees2.default.RBTree(temporalstate.change_cmp);
        }
    }, {
        key: '_priv_change_add',
        value: function _priv_change_add(change) {

            this.emit('add', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
            this._states[change.name].insert(change);
        }
    }, {
        key: '_priv_change_remove',
        value: function _priv_change_remove(change) {

            this.emit('rm', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
            this._states[change.name].remove(change);
        }
    }, {
        key: '_priv_change_change',
        value: function _priv_change_change(change, new_val) {

            var old_val = change.val;

            this.emit('change', { 'timestamp': change.timestamp, 'name': change.name, 'val': old_val }, new_val);
            change.val = new_val;
        }
    }], [{
        key: 'change_cmp',
        value: function change_cmp(a, b) {

            return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        }
    }, {
        key: 'change_valeqf',
        value: function change_valeqf(a, b) {

            return a === b;
        }
    }]);

    return temporalstate;
}(_events2.default);

exports.default = temporalstate;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJwYXJhbXMiLCJfc3RhdGVzIiwiX3R4biIsIl92YWxlcWYiLCJ2YWxlcWYiLCJjaGFuZ2VfdmFsZXFmIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwiaWQiLCJkZXNjciIsImZ1biIsInR4bl9zdGFjayIsImVtaXQiLCJwb3AiLCJjaGFuZ2UiLCJzdF9uYW1lIiwibmFtZSIsInN0X3ZhbCIsInZhbCIsInRzIiwidGltZXN0YW1wIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHhuX2Rlc2NyIiwidHhuX2Z1bnMiLCJfcHJpdl9jaGFuZ2VfYWRkIiwiYmluZCIsIl9wcml2X2NoYW5nZV9yZW1vdmUiLCJfcHJpdl9jaGFuZ2VfY2hhbmdlIiwidHhuIiwiZm9yRWFjaCIsImYiLCJmaW5kIiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJsb3dlckJvdW5kIiwicHJldl92YWxfY2hhbmdlcyIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwiZnJvbV90cyIsInRvX3RzIiwiZ3JlZWR5Iiwic3RfbmFtZXMiLCJ2YXJfbGlzdCIsInZhcl9uYW1lIiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9s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WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuaW1wb3J0IGV2ZW50X2VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIGV4dGVuZHMgZXZlbnRfZW1pdHRlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAocGFyYW1zID0ge30pIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLl90eG4gICAgPSBbXTtcbiAgICAgICAgdGhpcy5fdmFsZXFmID0gcGFyYW1zLnZhbGVxZiA/IHBhcmFtcy52YWxlcWYgOiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV92YWxlcWY7XG5cbiAgICB9XG5cbiAgICBjaGFuZ2VfbGlzdCAoKSB7XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgdmFsX2l0ZXJfZ3JwID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gW2kubmV4dCgpLCBpXSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB3aGlsZSAodmFsX2l0ZXJfZ3JwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCB2ID0gdmFsX2l0ZXJfZ3JwWzBdWzBdO1xuICAgICAgICAgICAgbGV0IGkgPSB2YWxfaXRlcl9ncnBbMF1bMV07XG4gICAgICAgICAgICBjaGFuZ2VzLnB1c2godik7XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnBbMF0gPSBbaS5uZXh0KCksIGldO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwID0gdmFsX2l0ZXJfZ3JwXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoYSkgPT4gYVswXSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzO1xuXG4gICAgfVxuXG4gICAgdHhuIChpZCwgZGVzY3IsIGZ1bikge1xuXG4gICAgICAgIGxldCB0eG5fc3RhY2sgPSB0aGlzLl90eG47XG5cbiAgICAgICAgdHhuX3N0YWNrLnB1c2goe1xuICAgICAgICAgICAgJ2lkJzogICAgaWQsXG4gICAgICAgICAgICAnZGVzY3InOiBkZXNjcixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG4gICAgICAgIGZ1bigpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG5cbiAgICAgICAgdHhuX3N0YWNrLnBvcCgpO1xuXG4gICAgfVxuXG4gICAgYWRkX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHZhbGVxZiA9IHRoaXMuX3ZhbGVxZjtcblxuICAgICAgICBsZXQgc3RfbmFtZSA9IGNoYW5nZS5uYW1lO1xuICAgICAgICBsZXQgc3RfdmFsICA9IGNoYW5nZS52YWw7XG4gICAgICAgIGxldCB0cyAgICAgID0gY2hhbmdlLnRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoc3RhdGVzW3N0X25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLl9wcml2X2FkZF9zdGF0ZShzdF9uYW1lKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZChjaGFuZ2UpO1xuICAgICAgICBsZXQgbmV4dCA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICBsZXQgY3VyID0gaXRlci5wcmV2KCk7XG5cbiAgICAgICAgbGV0IHR4bl9kZXNjciA9IFtdO1xuICAgICAgICBsZXQgdHhuX2Z1bnMgPSBbXTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoc3RfdmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncm0nOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKCF2YWxlcWYoY3VyLnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGVxZihwcmV2LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIGN1cikpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdmFsZXFmKGN1ci52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50eG4oXG4gICAgICAgICAgICB7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19LFxuICAgICAgICAgICAgdHhuX2Rlc2NyLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgeyB0eG5fZnVucy5mb3JFYWNoKChmKSA9PiBmKCkpOyB9XG4gICAgICAgICk7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgdmFsZXFmID0gdGhpcy5fdmFsZXFmO1xuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbY2hhbmdlLm5hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2ID0gc3RhdGUuZmluZChjaGFuZ2UpO1xuICAgICAgICBpZiAodiAhPT0gbnVsbCAmJiAhdmFsZXFmKHYudmFsLCBjaGFuZ2UudmFsKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcbiAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIHsncmVtb3ZlJzogY2hhbmdlfSwgW3sncmVtb3ZlJzogY2hhbmdlfV0pO1xuXG4gICAgfVxuXG4gICAgdmFyX2xpc3QgKCkge1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zdGF0ZXMpLnNvcnQoKTtcblxuICAgIH1cblxuICAgIGZpcnN0IChzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLml0ZXJhdG9yKCkubmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGZpcnN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5uZXh0KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAoZmlyc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBlYXJsaWVzdF90aW1lc3RhbXAgPSBmaXJzdF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBmaXJzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBlYXJsaWVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbGFzdCAoc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pdGVyYXRvcigpLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudXBwZXJCb3VuZChjdXJyZW50KS5kYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS5sb3dlckJvdW5kKGN1cnJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXIucHJldigpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHByZXZfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmxvd2VyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpLnByZXYoKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAocHJldl92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IHByZXZfdGltZXN0YW1wID0gcHJldl92YWxfY2hhbmdlc1twcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIHByZXZfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gcHJldl90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgYXQgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uZmluZCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBhZnRlciAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgYmVmb3JlICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5wcmV2KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZSAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjID09PSBudWxsID8gbnVsbCA6IHJlYy52YWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlYyA9IHRoaXMuc3RhdGUodHMsIHNuKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2Nbc25dID0gcmVjO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZV9kZXRhaWwgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4geydmcm9tJzogbnVsbCwgJ3RvJzogbnVsbH07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjID09PSBudWxsICYmIG5leHRfcmVjID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzbl07XG4gICAgICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCB8fCBuZXh0X3JlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIFtdKTtcblxuICAgIH1cblxuICAgIGJldHdlZW4gKGZyb21fdHMsIHRvX3RzLCBncmVlZHksIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChncmVlZHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGdyZWVkeSA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBzdF9uYW1lcyA9IHN0X25hbWUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB0aGlzLnZhcl9saXN0KClcbiAgICAgICAgICAgIDogW3N0X25hbWVdO1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RfbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lc1tpXV07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogZnJvbV90c30pO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsICYmIChncmVlZHkgfHwgY3VyX3JlYy50aW1lc3RhbXAgPT09IGZyb21fdHMpKVxuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIHdoaWxlICgoY3VyX3JlYyA9IGl0ZXIubmV4dCgpKSAmJiBjdXJfcmVjLnRpbWVzdGFtcCA8PSB0b190cykge1xuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIHJlbW92ZV92YXIgKHZhcl9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHN0YXRlICA9IHN0YXRlc1t2YXJfbmFtZV07XG5cbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZXNbdmFyX25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9hZGRfc3RhdGUgKHN0X25hbWUpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ25ld192YXInLCBzdF9uYW1lKTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW3N0X25hbWVdID0gbmV3IGJpbnRyZWVzLlJCVHJlZSh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2FkZCAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdhZGQnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0uaW5zZXJ0KGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfcmVtb3ZlIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ3JtJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLnJlbW92ZShjaGFuZ2UpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2NoYW5nZSAoY2hhbmdlLCBuZXdfdmFsKSB7XG5cbiAgICAgICAgbGV0IG9sZF92YWwgPSBjaGFuZ2UudmFsO1xuXG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogb2xkX3ZhbH0sIG5ld192YWwpO1xuICAgICAgICBjaGFuZ2UudmFsID0gbmV3X3ZhbDtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfY21wIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEudGltZXN0YW1wIDwgYi50aW1lc3RhbXAgPyAtMVxuICAgICAgICAgICAgOiBhLnRpbWVzdGFtcCA+IGIudGltZXN0YW1wID8gMVxuICAgICAgICAgICAgOiBhLm5hbWUgPCBiLm5hbWUgPyAtMVxuICAgICAgICAgICAgOiBhLm5hbWUgPiBiLm5hbWUgPyAxXG4gICAgICAgICAgICA6IDA7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX3ZhbGVxZiAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhID09PSBiO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgdGVtcG9yYWxzdGF0ZTtcbiJdfQ==
//# sourceMappingURL=temporalstate_es5.js.map
