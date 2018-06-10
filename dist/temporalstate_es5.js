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
                        if (next !== null && valeqf(next.val, st_val)) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
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
        value: function at(timestamp, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                return state.find({ 'timestamp': timestamp });
            }

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
                this.emit('rm_var', var_name);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJwYXJhbXMiLCJfc3RhdGVzIiwiX3R4biIsIl92YWxlcWYiLCJ2YWxlcWYiLCJjaGFuZ2VfdmFsZXFmIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwiaWQiLCJkZXNjciIsImZ1biIsInR4bl9zdGFjayIsImVtaXQiLCJwb3AiLCJjaGFuZ2UiLCJzdF9uYW1lIiwibmFtZSIsInN0X3ZhbCIsInZhbCIsInRzIiwidGltZXN0YW1wIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHhuX2Rlc2NyIiwidHhuX2Z1bnMiLCJfcHJpdl9jaGFuZ2VfYWRkIiwiYmluZCIsIl9wcml2X2NoYW5nZV9yZW1vdmUiLCJfcHJpdl9jaGFuZ2VfY2hhbmdlIiwidHhuIiwiZm9yRWFjaCIsImYiLCJmaW5kIiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJsb3dlckJvdW5kIiwicHJldl92YWxfY2hhbmdlcyIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwiZnJvbV90cyIsInRvX3RzIiwiZ3JlZWR5Iiwic3RfbmFtZXMiLCJ2YXJfbGlzdCIsInZhcl9uYW1lIiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9s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QUFhNkMsT0FBYjtBQUVIOzs7bUNBRWtCN0QsQyxFQUFHQyxDLEVBQUc7O0FBRXJCLG1CQUFPRCxFQUFFa0IsU0FBRixHQUFjakIsRUFBRWlCLFNBQWhCLEdBQTRCLENBQUMsQ0FBN0IsR0FDRGxCLEVBQUVrQixTQUFGLEdBQWNqQixFQUFFaUIsU0FBaEIsR0FBNEIsQ0FBNUIsR0FDQWxCLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFDLENBQW5CLEdBQ0FkLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFsQixHQUNBLENBSk47QUFNSDs7O3NDQUVxQmQsQyxFQUFHQyxDLEVBQUc7O0FBRXhCLG1CQUFPRCxNQUFNQyxDQUFiO0FBRUg7Ozs7OztrQkFLVXJCLGEiLCJmaWxlIjoidGVtcG9yYWxzdGF0ZV9lczUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuaW1wb3J0IGV2ZW50X2VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIGV4dGVuZHMgZXZlbnRfZW1pdHRlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAocGFyYW1zID0ge30pIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLl90eG4gICAgPSBbXTtcbiAgICAgICAgdGhpcy5fdmFsZXFmID0gcGFyYW1zLnZhbGVxZiA/IHBhcmFtcy52YWxlcWYgOiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV92YWxlcWY7XG5cbiAgICB9XG5cbiAgICBjaGFuZ2VfbGlzdCAoKSB7XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgdmFsX2l0ZXJfZ3JwID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gW2kubmV4dCgpLCBpXSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB3aGlsZSAodmFsX2l0ZXJfZ3JwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCB2ID0gdmFsX2l0ZXJfZ3JwWzBdWzBdO1xuICAgICAgICAgICAgbGV0IGkgPSB2YWxfaXRlcl9ncnBbMF1bMV07XG4gICAgICAgICAgICBjaGFuZ2VzLnB1c2godik7XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnBbMF0gPSBbaS5uZXh0KCksIGldO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwID0gdmFsX2l0ZXJfZ3JwXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoYSkgPT4gYVswXSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzO1xuXG4gICAgfVxuXG4gICAgdHhuIChpZCwgZGVzY3IsIGZ1bikge1xuXG4gICAgICAgIGxldCB0eG5fc3RhY2sgPSB0aGlzLl90eG47XG5cbiAgICAgICAgdHhuX3N0YWNrLnB1c2goe1xuICAgICAgICAgICAgJ2lkJzogICAgaWQsXG4gICAgICAgICAgICAnZGVzY3InOiBkZXNjcixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG4gICAgICAgIGZ1bigpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG5cbiAgICAgICAgdHhuX3N0YWNrLnBvcCgpO1xuXG4gICAgfVxuXG4gICAgYWRkX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHZhbGVxZiA9IHRoaXMuX3ZhbGVxZjtcblxuICAgICAgICBsZXQgc3RfbmFtZSA9IGNoYW5nZS5uYW1lO1xuICAgICAgICBsZXQgc3RfdmFsICA9IGNoYW5nZS52YWw7XG4gICAgICAgIGxldCB0cyAgICAgID0gY2hhbmdlLnRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoc3RhdGVzW3N0X25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLl9wcml2X2FkZF9zdGF0ZShzdF9uYW1lKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZChjaGFuZ2UpO1xuICAgICAgICBsZXQgbmV4dCA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICBsZXQgY3VyID0gaXRlci5wcmV2KCk7XG5cbiAgICAgICAgbGV0IHR4bl9kZXNjciA9IFtdO1xuICAgICAgICBsZXQgdHhuX2Z1bnMgPSBbXTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoc3RfdmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncm0nOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKCF2YWxlcWYoY3VyLnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGVxZihwcmV2LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIGN1cikpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXZhbGVxZihjdXIudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfYWRkLmJpbmQodGhpcywgeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSkpO1xuICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHhuKFxuICAgICAgICAgICAgeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSxcbiAgICAgICAgICAgIHR4bl9kZXNjcixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHsgdHhuX2Z1bnMuZm9yRWFjaCgoZikgPT4gZigpKTsgfVxuICAgICAgICApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHZhbGVxZiA9IHRoaXMuX3ZhbGVxZjtcbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW2NoYW5nZS5uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsZXQgdiA9IHN0YXRlLmZpbmQoY2hhbmdlKTtcbiAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgIXZhbGVxZih2LnZhbCwgY2hhbmdlLnZhbCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG4gICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pdGVyYXRvcigpLm5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBmaXJzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkubmV4dCgpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGZpcnN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgZWFybGllc3RfdGltZXN0YW1wID0gZmlyc3RfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gZmlyc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gZWFybGllc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGxhc3QgKHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuaXRlcmF0b3IoKS5wcmV2KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLnVwcGVyQm91bmQoY3VycmVudCkuZGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5leHRfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLnVwcGVyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApXG4gICAgICAgICAgICAgICAgICAgIGkubmV4dCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChuZXh0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgbmV4dF90aW1lc3RhbXAgPSBuZXh0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIG5leHRfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gbmV4dF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgcHJldiAoY3VycmVudCwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUubG93ZXJCb3VuZChjdXJyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVyLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGF0ICh0aW1lc3RhbXAsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5maW5kKHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5maW5kKHsndGltZXN0YW1wJzogdGltZXN0YW1wfSkpXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIGFmdGVyICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5uZXh0KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBiZWZvcmUgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLnByZXYoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIHN0YXRlICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCByZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIHJldHVybiByZWMgPT09IG51bGwgPyBudWxsIDogcmVjLnZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVjID0gdGhpcy5zdGF0ZSh0cywgc24pO1xuICAgICAgICAgICAgICAgIGlmIChyZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjY1tzbl0gPSByZWM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgIH1cblxuICAgIHN0YXRlX2RldGFpbCAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB7J2Zyb20nOiBudWxsLCAndG8nOiBudWxsfTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgPT09IG51bGwgJiYgbmV4dF9yZWMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3NuXTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsIHx8IG5leHRfcmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwgW10pO1xuXG4gICAgfVxuXG4gICAgYmV0d2VlbiAoZnJvbV90cywgdG9fdHMsIGdyZWVkeSwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKGdyZWVkeSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZ3JlZWR5ID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IHN0X25hbWVzID0gc3RfbmFtZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHRoaXMudmFyX2xpc3QoKVxuICAgICAgICAgICAgOiBbc3RfbmFtZV07XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdF9uYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVzW2ldXTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiBmcm9tX3RzfSk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgJiYgKGdyZWVkeSB8fCBjdXJfcmVjLnRpbWVzdGFtcCA9PT0gZnJvbV90cykpXG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgd2hpbGUgKChjdXJfcmVjID0gaXRlci5uZXh0KCkpICYmIGN1cl9yZWMudGltZXN0YW1wIDw9IHRvX3RzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXMuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX3ZhciAodmFyX25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgc3RhdGUgID0gc3RhdGVzW3Zhcl9uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdybV92YXInLCB2YXJfbmFtZSk7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGVzW3Zhcl9uYW1lXTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfYWRkX3N0YXRlIChzdF9uYW1lKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCduZXdfdmFyJywgc3RfbmFtZSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tzdF9uYW1lXSA9IG5ldyBiaW50cmVlcy5SQlRyZWUodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9hZGQgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgnYWRkJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLmluc2VydChjaGFuZ2UpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX3JlbW92ZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdybScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5yZW1vdmUoY2hhbmdlKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9jaGFuZ2UgKGNoYW5nZSwgbmV3X3ZhbCkge1xuXG4gICAgICAgIGxldCBvbGRfdmFsID0gY2hhbmdlLnZhbDtcblxuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IG9sZF92YWx9LCBuZXdfdmFsKTtcbiAgICAgICAgY2hhbmdlLnZhbCA9IG5ld192YWw7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX2NtcCAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhLnRpbWVzdGFtcCA8IGIudGltZXN0YW1wID8gLTFcbiAgICAgICAgICAgIDogYS50aW1lc3RhbXAgPiBiLnRpbWVzdGFtcCA/IDFcbiAgICAgICAgICAgIDogYS5uYW1lIDwgYi5uYW1lID8gLTFcbiAgICAgICAgICAgIDogYS5uYW1lID4gYi5uYW1lID8gMVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV92YWxlcWYgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYSA9PT0gYjtcblxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHRlbXBvcmFsc3RhdGU7XG4iXX0=
//# sourceMappingURL=temporalstate_es5.js.map
