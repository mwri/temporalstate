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
        _classCallCheck(this, temporalstate);

        var _this = _possibleConstructorReturn(this, (temporalstate.__proto__ || Object.getPrototypeOf(temporalstate)).call(this));

        _this._states = {};
        _this._txn = [];

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
                    if (next !== null && next.val === st_val) {
                        txn_descr.push({ 'rm': next });
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                }
            } else if (cur.timestamp === ts) {
                if (cur.val !== st_val) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) {
                            txn_descr.push({ 'remove': cur });
                            txn_funs.push(this._priv_change_remove.bind(this, cur));
                        } else {
                            txn_descr.push({ 'change': cur, 'new_val': st_val });
                            txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                        }
                        if (next !== null && next.val === st_val) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else if (prev.val === st_val) {
                        txn_descr.push({ 'remove': cur });
                        txn_funs.push(this._priv_change_remove.bind(this, cur));
                        if (next !== null && next.val === st_val) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else {
                        txn_descr.push({ 'change': cur, 'new_val': st_val });
                        txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                    }
                }
            } else if (cur.val !== st_val) {
                txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                if (next !== null && next.val === st_val) {
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
            var state = states[change.name];

            if (state === undefined) return;

            var v = state.find(change);
            if (v !== null && v.val !== change.val) return;

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
    }]);

    return temporalstate;
}(_events2.default);

exports.default = temporalstate;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiX3R4biIsImNoYW5nZXMiLCJzdGF0ZXMiLCJ2YWxfaXRlcl9ncnAiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwic24iLCJzaXplIiwibWFwIiwiaXRlcmF0b3IiLCJpIiwibmV4dCIsInNvcnQiLCJhIiwiYiIsImNoYW5nZV9jbXAiLCJsZW5ndGgiLCJ2IiwicHVzaCIsImlkIiwiZGVzY3IiLCJmdW4iLCJ0eG5fc3RhY2siLCJlbWl0IiwicG9wIiwiY2hhbmdlIiwic3RfbmFtZSIsIm5hbWUiLCJzdF92YWwiLCJ2YWwiLCJ0cyIsInRpbWVzdGFtcCIsInVuZGVmaW5lZCIsIl9wcml2X2FkZF9zdGF0ZSIsInN0YXRlIiwiaXRlciIsInVwcGVyQm91bmQiLCJkYXRhIiwiY3VyIiwicHJldiIsInR4bl9kZXNjciIsInR4bl9mdW5zIiwiX3ByaXZfY2hhbmdlX2FkZCIsImJpbmQiLCJfcHJpdl9jaGFuZ2VfcmVtb3ZlIiwiX3ByaXZfY2hhbmdlX2NoYW5nZSIsInR4biIsImZvckVhY2giLCJmIiwiZmluZCIsImZpcnN0X3ZhbF9jaGFuZ2VzIiwiZWFybGllc3RfdGltZXN0YW1wIiwibGFzdF92YWxfY2hhbmdlcyIsIm9sZGVzdF90aW1lc3RhbXAiLCJjdXJyZW50IiwibmV4dF92YWxfY2hhbmdlcyIsIm5leHRfdGltZXN0YW1wIiwibG93ZXJCb3VuZCIsInByZXZfdmFsX2NoYW5nZXMiLCJwcmV2X3RpbWVzdGFtcCIsInJlYyIsInJlZHVjZSIsImFjYyIsIm5leHRfcmVjIiwiY3VyX3JlYyIsImZyb21fdHMiLCJ0b190cyIsImdyZWVkeSIsInN0X25hbWVzIiwidmFyX2xpc3QiLCJ2YXJfbmFtZSIsIlJCVHJlZSIsImluc2VydCIsInJlbW92ZSIsIm5ld192YWwiLCJvbGRfdmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7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LE8sRUFBUzs7QUFFbEMsZ0JBQUlDLFVBQVVsRCxPQUFPSSxHQUFyQjs7QUFFQSxpQkFBS04sSUFBTCxDQUFVLFFBQVYsRUFBb0IsRUFBQyxhQUFhRSxPQUFPTSxTQUFyQixFQUFnQyxRQUFRTixPQUFPRSxJQUEvQyxFQUFxRCxPQUFPZ0QsT0FBNUQsRUFBcEIsRUFBMEZELE9BQTFGO0FBQ0FqRCxtQkFBT0ksR0FBUCxHQUFhNkMsT0FBYjtBQUVIOzs7bUNBRWtCN0QsQyxFQUFHQyxDLEVBQUc7O0FBRXJCLG1CQUFPRCxFQUFFa0IsU0FBRixHQUFjakIsRUFBRWlCLFNBQWhCLEdBQTRCLENBQUMsQ0FBN0IsR0FDRGxCLEVBQUVrQixTQUFGLEdBQWNqQixFQUFFaUIsU0FBaEIsR0FBNEIsQ0FBNUIsR0FDQWxCLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFDLENBQW5CLEdBQ0FkLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFsQixHQUNBLENBSk47QUFNSDs7Ozs7O2tCQUtVOUIsYSIsImZpbGUiOiJ0ZW1wb3JhbHN0YXRlX2VzNS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiaW50cmVlcyBmcm9tICdiaW50cmVlcyc7XG5pbXBvcnQgZXZlbnRfZW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5cbmNsYXNzIHRlbXBvcmFsc3RhdGUgZXh0ZW5kcyBldmVudF9lbWl0dGVyIHtcblxuICAgIGNvbnN0cnVjdG9yICgpIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLl90eG4gICAgPSBbXTtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICB0eG4gKGlkLCBkZXNjciwgZnVuKSB7XG5cbiAgICAgICAgbGV0IHR4bl9zdGFjayA9IHRoaXMuX3R4bjtcblxuICAgICAgICB0eG5fc3RhY2sucHVzaCh7XG4gICAgICAgICAgICAnaWQnOiAgICBpZCxcbiAgICAgICAgICAgICdkZXNjcic6IGRlc2NyLFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9zdGFydCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcbiAgICAgICAgZnVuKCk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcblxuICAgICAgICB0eG5fc3RhY2sucG9wKCk7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBzdF9uYW1lID0gY2hhbmdlLm5hbWU7XG4gICAgICAgIGxldCBzdF92YWwgID0gY2hhbmdlLnZhbDtcbiAgICAgICAgbGV0IHRzICAgICAgPSBjaGFuZ2UudGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChzdGF0ZXNbc3RfbmFtZV0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfYWRkX3N0YXRlKHN0X25hbWUpO1xuXG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKGNoYW5nZSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBsZXQgdHhuX2Rlc2NyID0gW107XG4gICAgICAgIGxldCB0eG5fZnVucyA9IFtdO1xuXG4gICAgICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChzdF92YWwgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2FkZC5iaW5kKHRoaXMsIHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncm0nOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHhuKFxuICAgICAgICAgICAgeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSxcbiAgICAgICAgICAgIHR4bl9kZXNjcixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHsgdHhuX2Z1bnMuZm9yRWFjaCgoZikgPT4gZigpKTsgfVxuICAgICAgICApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW2NoYW5nZS5uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsZXQgdiA9IHN0YXRlLmZpbmQoY2hhbmdlKTtcbiAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgdi52YWwgIT09IGNoYW5nZS52YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG4gICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pdGVyYXRvcigpLm5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBmaXJzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkubmV4dCgpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGZpcnN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgZWFybGllc3RfdGltZXN0YW1wID0gZmlyc3RfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gZmlyc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gZWFybGllc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGxhc3QgKHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuaXRlcmF0b3IoKS5wcmV2KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLnVwcGVyQm91bmQoY3VycmVudCkuZGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5leHRfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLnVwcGVyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApXG4gICAgICAgICAgICAgICAgICAgIGkubmV4dCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChuZXh0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgbmV4dF90aW1lc3RhbXAgPSBuZXh0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIG5leHRfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gbmV4dF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgcHJldiAoY3VycmVudCwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUubG93ZXJCb3VuZChjdXJyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVyLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGF0ICh0aW1lc3RhbXApIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmZpbmQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgYWZ0ZXIgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLm5leHQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIGJlZm9yZSAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJldih7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgc3RhdGUgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IHJlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYyA9PT0gbnVsbCA/IG51bGwgOiByZWMudmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWMgPSB0aGlzLnN0YXRlKHRzLCBzbik7XG4gICAgICAgICAgICAgICAgaWYgKHJlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjW3NuXSA9IHJlYztcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgfVxuXG4gICAgc3RhdGVfZGV0YWlsICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsnZnJvbSc6IG51bGwsICd0byc6IG51bGx9O1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyA9PT0gbnVsbCAmJiBuZXh0X3JlYyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc25dO1xuICAgICAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgfHwgbmV4dF9yZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCBbXSk7XG5cbiAgICB9XG5cbiAgICBiZXR3ZWVuIChmcm9tX3RzLCB0b190cywgZ3JlZWR5LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoZ3JlZWR5ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBncmVlZHkgPSBmYWxzZTtcblxuICAgICAgICBsZXQgc3RfbmFtZXMgPSBzdF9uYW1lID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gdGhpcy52YXJfbGlzdCgpXG4gICAgICAgICAgICA6IFtzdF9uYW1lXTtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0X25hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZXNbaV1dO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IGZyb21fdHN9KTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCAmJiAoZ3JlZWR5IHx8IGN1cl9yZWMudGltZXN0YW1wID09PSBmcm9tX3RzKSlcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB3aGlsZSAoKGN1cl9yZWMgPSBpdGVyLm5leHQoKSkgJiYgY3VyX3JlYy50aW1lc3RhbXAgPD0gdG9fdHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcy5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfdmFyICh2YXJfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgICAgIGxldCBzdGF0ZSAgPSBzdGF0ZXNbdmFyX25hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGVzW3Zhcl9uYW1lXTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfYWRkX3N0YXRlIChzdF9uYW1lKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCduZXdfdmFyJywgc3RfbmFtZSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tzdF9uYW1lXSA9IG5ldyBiaW50cmVlcy5SQlRyZWUodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9hZGQgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgnYWRkJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLmluc2VydChjaGFuZ2UpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX3JlbW92ZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdybScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5yZW1vdmUoY2hhbmdlKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9jaGFuZ2UgKGNoYW5nZSwgbmV3X3ZhbCkge1xuXG4gICAgICAgIGxldCBvbGRfdmFsID0gY2hhbmdlLnZhbDtcblxuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IG9sZF92YWx9LCBuZXdfdmFsKTtcbiAgICAgICAgY2hhbmdlLnZhbCA9IG5ld192YWw7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX2NtcCAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhLnRpbWVzdGFtcCA8IGIudGltZXN0YW1wID8gLTFcbiAgICAgICAgICAgIDogYS50aW1lc3RhbXAgPiBiLnRpbWVzdGFtcCA/IDFcbiAgICAgICAgICAgIDogYS5uYW1lIDwgYi5uYW1lID8gLTFcbiAgICAgICAgICAgIDogYS5uYW1lID4gYi5uYW1lID8gMVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgdGVtcG9yYWxzdGF0ZTtcbiJdfQ==
//# sourceMappingURL=temporalstate_es5.js.map
