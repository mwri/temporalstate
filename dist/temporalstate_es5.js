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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJwYXJhbXMiLCJfc3RhdGVzIiwiX3R4biIsIl92YWxlcWYiLCJ2YWxlcWYiLCJjaGFuZ2VfdmFsZXFmIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwiaWQiLCJkZXNjciIsImZ1biIsInR4bl9zdGFjayIsImVtaXQiLCJwb3AiLCJjaGFuZ2UiLCJzdF9uYW1lIiwibmFtZSIsInN0X3ZhbCIsInZhbCIsInRzIiwidGltZXN0YW1wIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHhuX2Rlc2NyIiwidHhuX2Z1bnMiLCJfcHJpdl9jaGFuZ2VfYWRkIiwiYmluZCIsIl9wcml2X2NoYW5nZV9yZW1vdmUiLCJfcHJpdl9jaGFuZ2VfY2hhbmdlIiwidHhuIiwiZm9yRWFjaCIsImYiLCJmaW5kIiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJsb3dlckJvdW5kIiwicHJldl92YWxfY2hhbmdlcyIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwiZnJvbV90cyIsInRvX3RzIiwiZ3JlZWR5Iiwic3RfbmFtZXMiLCJ2YXJfbGlzdCIsInZhcl9uYW1lIiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9s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QUFoQixHQUE0QixDQUE1QixHQUNBbEIsRUFBRWMsSUFBRixHQUFTYixFQUFFYSxJQUFYLEdBQWtCLENBQUMsQ0FBbkIsR0FDQWQsRUFBRWMsSUFBRixHQUFTYixFQUFFYSxJQUFYLEdBQWtCLENBQWxCLEdBQ0EsQ0FKTjtBQU1IOzs7c0NBRXFCZCxDLEVBQUdDLEMsRUFBRzs7QUFFeEIsbUJBQU9ELE1BQU1DLENBQWI7QUFFSDs7Ozs7O2tCQUtVckIsYSIsImZpbGUiOiJ0ZW1wb3JhbHN0YXRlX2VzNS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiaW50cmVlcyBmcm9tICdiaW50cmVlcyc7XG5pbXBvcnQgZXZlbnRfZW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5cbmNsYXNzIHRlbXBvcmFsc3RhdGUgZXh0ZW5kcyBldmVudF9lbWl0dGVyIHtcblxuICAgIGNvbnN0cnVjdG9yIChwYXJhbXMgPSB7fSkge1xuXG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzID0ge307XG4gICAgICAgIHRoaXMuX3R4biAgICA9IFtdO1xuICAgICAgICB0aGlzLl92YWxlcWYgPSBwYXJhbXMudmFsZXFmID8gcGFyYW1zLnZhbGVxZiA6IHRlbXBvcmFsc3RhdGUuY2hhbmdlX3ZhbGVxZjtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICB0eG4gKGlkLCBkZXNjciwgZnVuKSB7XG5cbiAgICAgICAgbGV0IHR4bl9zdGFjayA9IHRoaXMuX3R4bjtcblxuICAgICAgICB0eG5fc3RhY2sucHVzaCh7XG4gICAgICAgICAgICAnaWQnOiAgICBpZCxcbiAgICAgICAgICAgICdkZXNjcic6IGRlc2NyLFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9zdGFydCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcbiAgICAgICAgZnVuKCk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcblxuICAgICAgICB0eG5fc3RhY2sucG9wKCk7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgdmFsZXFmID0gdGhpcy5fdmFsZXFmO1xuXG4gICAgICAgIGxldCBzdF9uYW1lID0gY2hhbmdlLm5hbWU7XG4gICAgICAgIGxldCBzdF92YWwgID0gY2hhbmdlLnZhbDtcbiAgICAgICAgbGV0IHRzICAgICAgPSBjaGFuZ2UudGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChzdGF0ZXNbc3RfbmFtZV0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfYWRkX3N0YXRlKHN0X25hbWUpO1xuXG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKGNoYW5nZSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBsZXQgdHhuX2Rlc2NyID0gW107XG4gICAgICAgIGxldCB0eG5fZnVucyA9IFtdO1xuXG4gICAgICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChzdF92YWwgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2FkZC5iaW5kKHRoaXMsIHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci50aW1lc3RhbXAgPT09IHRzKSB7XG4gICAgICAgICAgICBpZiAoIXZhbGVxZihjdXIudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByZXYgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RfdmFsID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBjdXIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIHZhbGVxZihuZXh0LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsZXFmKHByZXYudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIHZhbGVxZihuZXh0LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZS5iaW5kKHRoaXMsIGN1ciwgc3RfdmFsKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIHZhbGVxZihuZXh0LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdmFsZXFmKGN1ci52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiB2YWxlcWYobmV4dC52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50eG4oXG4gICAgICAgICAgICB7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19LFxuICAgICAgICAgICAgdHhuX2Rlc2NyLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgeyB0eG5fZnVucy5mb3JFYWNoKChmKSA9PiBmKCkpOyB9XG4gICAgICAgICk7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgdmFsZXFmID0gdGhpcy5fdmFsZXFmO1xuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbY2hhbmdlLm5hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2ID0gc3RhdGUuZmluZChjaGFuZ2UpO1xuICAgICAgICBpZiAodiAhPT0gbnVsbCAmJiAhdmFsZXFmKHYudmFsLCBjaGFuZ2UudmFsKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcbiAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIHsncmVtb3ZlJzogY2hhbmdlfSwgW3sncmVtb3ZlJzogY2hhbmdlfV0pO1xuXG4gICAgfVxuXG4gICAgdmFyX2xpc3QgKCkge1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zdGF0ZXMpLnNvcnQoKTtcblxuICAgIH1cblxuICAgIGZpcnN0IChzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLml0ZXJhdG9yKCkubmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGZpcnN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5uZXh0KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAoZmlyc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBlYXJsaWVzdF90aW1lc3RhbXAgPSBmaXJzdF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBmaXJzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBlYXJsaWVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbGFzdCAoc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pdGVyYXRvcigpLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudXBwZXJCb3VuZChjdXJyZW50KS5kYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS5sb3dlckJvdW5kKGN1cnJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXIucHJldigpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHByZXZfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmxvd2VyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpLnByZXYoKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAocHJldl92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IHByZXZfdGltZXN0YW1wID0gcHJldl92YWxfY2hhbmdlc1twcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIHByZXZfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gcHJldl90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgYXQgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uZmluZCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBhZnRlciAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgYmVmb3JlICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5wcmV2KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZSAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjID09PSBudWxsID8gbnVsbCA6IHJlYy52YWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlYyA9IHRoaXMuc3RhdGUodHMsIHNuKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2Nbc25dID0gcmVjO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZV9kZXRhaWwgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4geydmcm9tJzogbnVsbCwgJ3RvJzogbnVsbH07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjID09PSBudWxsICYmIG5leHRfcmVjID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzbl07XG4gICAgICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCB8fCBuZXh0X3JlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIFtdKTtcblxuICAgIH1cblxuICAgIGJldHdlZW4gKGZyb21fdHMsIHRvX3RzLCBncmVlZHksIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChncmVlZHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGdyZWVkeSA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBzdF9uYW1lcyA9IHN0X25hbWUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB0aGlzLnZhcl9saXN0KClcbiAgICAgICAgICAgIDogW3N0X25hbWVdO1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RfbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lc1tpXV07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogZnJvbV90c30pO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsICYmIChncmVlZHkgfHwgY3VyX3JlYy50aW1lc3RhbXAgPT09IGZyb21fdHMpKVxuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIHdoaWxlICgoY3VyX3JlYyA9IGl0ZXIubmV4dCgpKSAmJiBjdXJfcmVjLnRpbWVzdGFtcCA8PSB0b190cykge1xuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIHJlbW92ZV92YXIgKHZhcl9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHN0YXRlICA9IHN0YXRlc1t2YXJfbmFtZV07XG5cbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncm1fdmFyJywgdmFyX25hbWUpO1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlc1t2YXJfbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH1cblxuICAgIF9wcml2X2FkZF9zdGF0ZSAoc3RfbmFtZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgnbmV3X3ZhcicsIHN0X25hbWUpO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbc3RfbmFtZV0gPSBuZXcgYmludHJlZXMuUkJUcmVlKHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfYWRkIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ2FkZCcsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5pbnNlcnQoY2hhbmdlKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9yZW1vdmUgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgncm0nLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0ucmVtb3ZlKGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfY2hhbmdlIChjaGFuZ2UsIG5ld192YWwpIHtcblxuICAgICAgICBsZXQgb2xkX3ZhbCA9IGNoYW5nZS52YWw7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBvbGRfdmFsfSwgbmV3X3ZhbCk7XG4gICAgICAgIGNoYW5nZS52YWwgPSBuZXdfdmFsO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV9jbXAgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYS50aW1lc3RhbXAgPCBiLnRpbWVzdGFtcCA/IC0xXG4gICAgICAgICAgICA6IGEudGltZXN0YW1wID4gYi50aW1lc3RhbXAgPyAxXG4gICAgICAgICAgICA6IGEubmFtZSA8IGIubmFtZSA/IC0xXG4gICAgICAgICAgICA6IGEubmFtZSA+IGIubmFtZSA/IDFcbiAgICAgICAgICAgIDogMDtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfdmFsZXFmIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEgPT09IGI7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgZGVmYXVsdCB0ZW1wb3JhbHN0YXRlO1xuIl19
//# sourceMappingURL=temporalstate_es5.js.map
