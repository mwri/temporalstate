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
                txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                if (next !== null && next.val === st_val) {
                    txn_descr.push({ 'rm': next });
                    txn_funs.push(this._priv_change_remove.bind(this, next));
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
        value: function first() {

            var states = this._states;

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
        value: function last() {

            var states = this._states;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiX3R4biIsImNoYW5nZXMiLCJzdGF0ZXMiLCJ2YWxfaXRlcl9ncnAiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwic24iLCJzaXplIiwibWFwIiwiaXRlcmF0b3IiLCJpIiwibmV4dCIsInNvcnQiLCJhIiwiYiIsImNoYW5nZV9jbXAiLCJsZW5ndGgiLCJ2IiwicHVzaCIsImlkIiwiZGVzY3IiLCJmdW4iLCJ0eG5fc3RhY2siLCJlbWl0IiwicG9wIiwiY2hhbmdlIiwic3RfbmFtZSIsIm5hbWUiLCJzdF92YWwiLCJ2YWwiLCJ0cyIsInRpbWVzdGFtcCIsInVuZGVmaW5lZCIsIl9wcml2X2FkZF9zdGF0ZSIsInN0YXRlIiwiaXRlciIsInVwcGVyQm91bmQiLCJkYXRhIiwiY3VyIiwicHJldiIsInR4bl9kZXNjciIsInR4bl9mdW5zIiwiX3ByaXZfY2hhbmdlX2FkZCIsImJpbmQiLCJfcHJpdl9jaGFuZ2VfcmVtb3ZlIiwiX3ByaXZfY2hhbmdlX2NoYW5nZSIsInR4biIsImZvckVhY2giLCJmIiwiZmluZCIsImZpcnN0X3ZhbF9jaGFuZ2VzIiwiZWFybGllc3RfdGltZXN0YW1wIiwibGFzdF92YWxfY2hhbmdlcyIsIm9sZGVzdF90aW1lc3RhbXAiLCJjdXJyZW50IiwibmV4dF92YWxfY2hhbmdlcyIsIm5leHRfdGltZXN0YW1wIiwibG93ZXJCb3VuZCIsInByZXZfdmFsX2NoYW5nZXMiLCJwcmV2X3RpbWVzdGFtcCIsInJlYyIsInJlZHVjZSIsImFjYyIsIm5leHRfcmVjIiwiY3VyX3JlYyIsImZyb21fdHMiLCJ0b190cyIsImdyZWVkeSIsInN0X25hbWVzIiwidmFyX2xpc3QiLCJSQlRyZWUiLCJpbnNlcnQiLCJyZW1vdmUiLCJuZXdfdmFsIiwib2xkX3ZhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFH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RSxJQUFwQixFQUEwQjRDLE1BQTFCLENBQWlDOUMsTUFBakM7QUFFSDs7OzRDQUVvQkEsTSxFQUFROztBQUV6QixpQkFBS0YsSUFBTCxDQUFVLElBQVYsRUFBZ0IsRUFBQyxhQUFhRSxPQUFPTSxTQUFyQixFQUFnQyxRQUFRTixPQUFPRSxJQUEvQyxFQUFxRCxPQUFPRixPQUFPSSxHQUFuRSxFQUFoQjtBQUNBLGlCQUFLL0IsT0FBTCxDQUFhMkIsT0FBT0UsSUFBcEIsRUFBMEI2QyxNQUExQixDQUFpQy9DLE1BQWpDO0FBRUg7Ozs0Q0FFb0JBLE0sRUFBUWdELE8sRUFBUzs7QUFFbEMsZ0JBQUlDLFVBQVVqRCxPQUFPSSxHQUFyQjs7QUFFQSxpQkFBS04sSUFBTCxDQUFVLFFBQVYsRUFBb0IsRUFBQyxhQUFhRSxPQUFPTSxTQUFyQixFQUFnQyxRQUFRTixPQUFPRSxJQUEvQyxFQUFxRCxPQUFPK0MsT0FBNUQsRUFBcEIsRUFBMEZELE9BQTFGO0FBQ0FoRCxtQkFBT0ksR0FBUCxHQUFhNEMsT0FBYjtBQUVIOzs7bUNBRWtCNUQsQyxFQUFHQyxDLEVBQUc7O0FBRXJCLG1CQUFPRCxFQUFFa0IsU0FBRixHQUFjakIsRUFBRWlCLFNBQWhCLEdBQTRCLENBQUMsQ0FBN0IsR0FDRGxCLEVBQUVrQixTQUFGLEdBQWNqQixFQUFFaUIsU0FBaEIsR0FBNEIsQ0FBNUIsR0FDQWxCLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFDLENBQW5CLEdBQ0FkLEVBQUVjLElBQUYsR0FBU2IsRUFBRWEsSUFBWCxHQUFrQixDQUFsQixHQUNBLENBSk47QUFNSDs7Ozs7O2tCQUtVOUIsYSIsImZpbGUiOiJ0ZW1wb3JhbHN0YXRlX2VzNS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiaW50cmVlcyBmcm9tICdiaW50cmVlcyc7XG5pbXBvcnQgZXZlbnRfZW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5cbmNsYXNzIHRlbXBvcmFsc3RhdGUgZXh0ZW5kcyBldmVudF9lbWl0dGVyIHtcblxuICAgIGNvbnN0cnVjdG9yICgpIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuICAgICAgICB0aGlzLl90eG4gICAgPSBbXTtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICB0eG4gKGlkLCBkZXNjciwgZnVuKSB7XG5cbiAgICAgICAgbGV0IHR4bl9zdGFjayA9IHRoaXMuX3R4bjtcblxuICAgICAgICB0eG5fc3RhY2sucHVzaCh7XG4gICAgICAgICAgICAnaWQnOiAgICBpZCxcbiAgICAgICAgICAgICdkZXNjcic6IGRlc2NyLFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9zdGFydCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcbiAgICAgICAgZnVuKCk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIGlkLCBkZXNjciwgdHhuX3N0YWNrKTtcblxuICAgICAgICB0eG5fc3RhY2sucG9wKCk7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBzdF9uYW1lID0gY2hhbmdlLm5hbWU7XG4gICAgICAgIGxldCBzdF92YWwgID0gY2hhbmdlLnZhbDtcbiAgICAgICAgbGV0IHRzICAgICAgPSBjaGFuZ2UudGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChzdGF0ZXNbc3RfbmFtZV0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfYWRkX3N0YXRlKHN0X25hbWUpO1xuXG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKGNoYW5nZSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBsZXQgdHhuX2Rlc2NyID0gW107XG4gICAgICAgIGxldCB0eG5fZnVucyA9IFtdO1xuXG4gICAgICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgY3VyKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHhuKFxuICAgICAgICAgICAgeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSxcbiAgICAgICAgICAgIHR4bl9kZXNjcixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHsgdHhuX2Z1bnMuZm9yRWFjaCgoZikgPT4gZigpKTsgfVxuICAgICAgICApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW2NoYW5nZS5uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsZXQgdiA9IHN0YXRlLmZpbmQoY2hhbmdlKTtcbiAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgdi52YWwgIT09IGNoYW5nZS52YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG4gICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgZmlyc3RfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBpLm5leHQoKSlcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChmaXJzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IGVhcmxpZXN0X3RpbWVzdGFtcCA9IGZpcnN0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGZpcnN0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IGVhcmxpZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBsYXN0ICgpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudXBwZXJCb3VuZChjdXJyZW50KS5kYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS5sb3dlckJvdW5kKGN1cnJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXIucHJldigpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHByZXZfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmxvd2VyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpLnByZXYoKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAocHJldl92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IHByZXZfdGltZXN0YW1wID0gcHJldl92YWxfY2hhbmdlc1twcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIHByZXZfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gcHJldl90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgYXQgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uZmluZCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBhZnRlciAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgYmVmb3JlICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5wcmV2KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZSAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjID09PSBudWxsID8gbnVsbCA6IHJlYy52YWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlYyA9IHRoaXMuc3RhdGUodHMsIHNuKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2Nbc25dID0gcmVjO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZV9kZXRhaWwgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4geydmcm9tJzogbnVsbCwgJ3RvJzogbnVsbH07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjID09PSBudWxsICYmIG5leHRfcmVjID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzbl07XG4gICAgICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCB8fCBuZXh0X3JlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIFtdKTtcblxuICAgIH1cblxuICAgIGJldHdlZW4gKGZyb21fdHMsIHRvX3RzLCBncmVlZHksIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChncmVlZHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGdyZWVkeSA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBzdF9uYW1lcyA9IHN0X25hbWUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB0aGlzLnZhcl9saXN0KClcbiAgICAgICAgICAgIDogW3N0X25hbWVdO1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RfbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lc1tpXV07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogZnJvbV90c30pO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsICYmIChncmVlZHkgfHwgY3VyX3JlYy50aW1lc3RhbXAgPT09IGZyb21fdHMpKVxuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIHdoaWxlICgoY3VyX3JlYyA9IGl0ZXIubmV4dCgpKSAmJiBjdXJfcmVjLnRpbWVzdGFtcCA8PSB0b190cykge1xuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIF9wcml2X2FkZF9zdGF0ZSAoc3RfbmFtZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgnbmV3X3ZhcicsIHN0X25hbWUpO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbc3RfbmFtZV0gPSBuZXcgYmludHJlZXMuUkJUcmVlKHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfYWRkIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ2FkZCcsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5pbnNlcnQoY2hhbmdlKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9yZW1vdmUgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgncm0nLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0ucmVtb3ZlKGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfY2hhbmdlIChjaGFuZ2UsIG5ld192YWwpIHtcblxuICAgICAgICBsZXQgb2xkX3ZhbCA9IGNoYW5nZS52YWw7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBvbGRfdmFsfSwgbmV3X3ZhbCk7XG4gICAgICAgIGNoYW5nZS52YWwgPSBuZXdfdmFsO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV9jbXAgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYS50aW1lc3RhbXAgPCBiLnRpbWVzdGFtcCA/IC0xXG4gICAgICAgICAgICA6IGEudGltZXN0YW1wID4gYi50aW1lc3RhbXAgPyAxXG4gICAgICAgICAgICA6IGEubmFtZSA8IGIubmFtZSA/IC0xXG4gICAgICAgICAgICA6IGEubmFtZSA+IGIubmFtZSA/IDFcbiAgICAgICAgICAgIDogMDtcblxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHRlbXBvcmFsc3RhdGU7XG4iXX0=
//# sourceMappingURL=temporalstate_es5.js.map
