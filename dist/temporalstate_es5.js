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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiX3R4biIsImNoYW5nZXMiLCJzdGF0ZXMiLCJ2YWxfaXRlcl9ncnAiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwic24iLCJzaXplIiwibWFwIiwiaXRlcmF0b3IiLCJpIiwibmV4dCIsInNvcnQiLCJhIiwiYiIsImNoYW5nZV9jbXAiLCJsZW5ndGgiLCJ2IiwicHVzaCIsImlkIiwiZGVzY3IiLCJmdW4iLCJ0eG5fc3RhY2siLCJlbWl0IiwicG9wIiwiY2hhbmdlIiwic3RfbmFtZSIsIm5hbWUiLCJzdF92YWwiLCJ2YWwiLCJ0cyIsInRpbWVzdGFtcCIsInVuZGVmaW5lZCIsIl9wcml2X2FkZF9zdGF0ZSIsInN0YXRlIiwiaXRlciIsInVwcGVyQm91bmQiLCJkYXRhIiwiY3VyIiwicHJldiIsInR4bl9kZXNjciIsInR4bl9mdW5zIiwiX3ByaXZfY2hhbmdlX2FkZCIsImJpbmQiLCJfcHJpdl9jaGFuZ2VfcmVtb3ZlIiwiX3ByaXZfY2hhbmdlX2NoYW5nZSIsInR4biIsImZvckVhY2giLCJmIiwiZmluZCIsImZpcnN0X3ZhbF9jaGFuZ2VzIiwiZWFybGllc3RfdGltZXN0YW1wIiwibGFzdF92YWxfY2hhbmdlcyIsIm9sZGVzdF90aW1lc3RhbXAiLCJjdXJyZW50IiwibmV4dF92YWxfY2hhbmdlcyIsIm5leHRfdGltZXN0YW1wIiwibG93ZXJCb3VuZCIsInByZXZfdmFsX2NoYW5nZXMiLCJwcmV2X3RpbWVzdGFtcCIsInJlYyIsInJlZHVjZSIsImFjYyIsIm5leHRfcmVjIiwiY3VyX3JlYyIsImZyb21fdHMiLCJ0b190cyIsImdyZWVkeSIsInN0X25hbWVzIiwidmFyX2xpc3QiLCJSQlRyZWUiLCJpbnNlcnQiLCJyZW1vdmUiLCJuZXdfdmFsIiwib2xkX3ZhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFH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QUFqQjtBQUNBLGlCQUFLL0IsT0FBTCxDQUFhMkIsT0FBT0UsSUFBcEIsRUFBMEI0QyxNQUExQixDQUFpQzlDLE1BQWpDO0FBRUg7Ozs0Q0FFb0JBLE0sRUFBUTs7QUFFekIsaUJBQUtGLElBQUwsQ0FBVSxJQUFWLEVBQWdCLEVBQUMsYUFBYUUsT0FBT00sU0FBckIsRUFBZ0MsUUFBUU4sT0FBT0UsSUFBL0MsRUFBcUQsT0FBT0YsT0FBT0ksR0FBbkUsRUFBaEI7QUFDQSxpQkFBSy9CLE9BQUwsQ0FBYTJCLE9BQU9FLElBQXBCLEVBQTBCNkMsTUFBMUIsQ0FBaUMvQyxNQUFqQztBQUVIOzs7NENBRW9CQSxNLEVBQVFnRCxPLEVBQVM7O0FBRWxDLGdCQUFJQyxVQUFVakQsT0FBT0ksR0FBckI7O0FBRUEsaUJBQUtOLElBQUwsQ0FBVSxRQUFWLEVBQW9CLEVBQUMsYUFBYUUsT0FBT00sU0FBckIsRUFBZ0MsUUFBUU4sT0FBT0UsSUFBL0MsRUFBcUQsT0FBTytDLE9BQTVELEVBQXBCLEVBQTBGRCxPQUExRjtBQUNBaEQsbUJBQU9JLEdBQVAsR0FBYTRDLE9BQWI7QUFFSDs7O21DQUVrQjVELEMsRUFBR0MsQyxFQUFHOztBQUVyQixtQkFBT0QsRUFBRWtCLFNBQUYsR0FBY2pCLEVBQUVpQixTQUFoQixHQUE0QixDQUFDLENBQTdCLEdBQ0RsQixFQUFFa0IsU0FBRixHQUFjakIsRUFBRWlCLFNBQWhCLEdBQTRCLENBQTVCLEdBQ0FsQixFQUFFYyxJQUFGLEdBQVNiLEVBQUVhLElBQVgsR0FBa0IsQ0FBQyxDQUFuQixHQUNBZCxFQUFFYyxJQUFGLEdBQVNiLEVBQUVhLElBQVgsR0FBa0IsQ0FBbEIsR0FDQSxDQUpOO0FBTUg7Ozs7OztrQkFLVTlCLGEiLCJmaWxlIjoidGVtcG9yYWxzdGF0ZV9lczUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuaW1wb3J0IGV2ZW50X2VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIGV4dGVuZHMgZXZlbnRfZW1pdHRlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fdHhuICAgID0gW107XG5cbiAgICB9XG5cbiAgICBjaGFuZ2VfbGlzdCAoKSB7XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgdmFsX2l0ZXJfZ3JwID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gW2kubmV4dCgpLCBpXSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB3aGlsZSAodmFsX2l0ZXJfZ3JwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCB2ID0gdmFsX2l0ZXJfZ3JwWzBdWzBdO1xuICAgICAgICAgICAgbGV0IGkgPSB2YWxfaXRlcl9ncnBbMF1bMV07XG4gICAgICAgICAgICBjaGFuZ2VzLnB1c2godik7XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnBbMF0gPSBbaS5uZXh0KCksIGldO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwID0gdmFsX2l0ZXJfZ3JwXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoYSkgPT4gYVswXSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzO1xuXG4gICAgfVxuXG4gICAgdHhuIChpZCwgZGVzY3IsIGZ1bikge1xuXG4gICAgICAgIGxldCB0eG5fc3RhY2sgPSB0aGlzLl90eG47XG5cbiAgICAgICAgdHhuX3N0YWNrLnB1c2goe1xuICAgICAgICAgICAgJ2lkJzogICAgaWQsXG4gICAgICAgICAgICAnZGVzY3InOiBkZXNjcixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG4gICAgICAgIGZ1bigpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCBpZCwgZGVzY3IsIHR4bl9zdGFjayk7XG5cbiAgICAgICAgdHhuX3N0YWNrLnBvcCgpO1xuXG4gICAgfVxuXG4gICAgYWRkX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgc3RfbmFtZSA9IGNoYW5nZS5uYW1lO1xuICAgICAgICBsZXQgc3RfdmFsICA9IGNoYW5nZS52YWw7XG4gICAgICAgIGxldCB0cyAgICAgID0gY2hhbmdlLnRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoc3RhdGVzW3N0X25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLl9wcml2X2FkZF9zdGF0ZShzdF9uYW1lKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZChjaGFuZ2UpO1xuICAgICAgICBsZXQgbmV4dCA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICBsZXQgY3VyID0gaXRlci5wcmV2KCk7XG5cbiAgICAgICAgbGV0IHR4bl9kZXNjciA9IFtdO1xuICAgICAgICBsZXQgdHhuX2Z1bnMgPSBbXTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoc3RfdmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9hZGQuYmluZCh0aGlzLCB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnRpbWVzdGFtcCA9PT0gdHMpIHtcbiAgICAgICAgICAgIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICBsZXQgcHJldiA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdF92YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIGN1cikpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZS5iaW5kKHRoaXMsIGN1ciwgc3RfdmFsKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldi52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIGN1cikpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfYWRkLmJpbmQodGhpcywgeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSkpO1xuICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncm0nOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnR4bihcbiAgICAgICAgICAgIHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0sXG4gICAgICAgICAgICB0eG5fZGVzY3IsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7IHR4bl9mdW5zLmZvckVhY2goKGYpID0+IGYoKSk7IH1cbiAgICAgICAgKTtcblxuICAgIH1cblxuICAgIHJlbW92ZV9jaGFuZ2UgKGNoYW5nZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tjaGFuZ2UubmFtZV07XG5cbiAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgbGV0IHYgPSBzdGF0ZS5maW5kKGNoYW5nZSk7XG4gICAgICAgIGlmICh2ICE9PSBudWxsICYmIHYudmFsICE9PSBjaGFuZ2UudmFsKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9zdGFydCcsIHsncmVtb3ZlJzogY2hhbmdlfSwgW3sncmVtb3ZlJzogY2hhbmdlfV0pO1xuICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUoY2hhbmdlKTtcbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fZW5kJywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG5cbiAgICB9XG5cbiAgICB2YXJfbGlzdCAoKSB7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRlcykuc29ydCgpO1xuXG4gICAgfVxuXG4gICAgZmlyc3QgKCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IGZpcnN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5uZXh0KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAoZmlyc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBlYXJsaWVzdF90aW1lc3RhbXAgPSBmaXJzdF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBmaXJzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBlYXJsaWVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbGFzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLnVwcGVyQm91bmQoY3VycmVudCkuZGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5leHRfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLnVwcGVyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApXG4gICAgICAgICAgICAgICAgICAgIGkubmV4dCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChuZXh0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgbmV4dF90aW1lc3RhbXAgPSBuZXh0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIG5leHRfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gbmV4dF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgcHJldiAoY3VycmVudCwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUubG93ZXJCb3VuZChjdXJyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVyLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGF0ICh0aW1lc3RhbXApIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmZpbmQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgYWZ0ZXIgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLm5leHQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIGJlZm9yZSAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJldih7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgc3RhdGUgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IHJlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYyA9PT0gbnVsbCA/IG51bGwgOiByZWMudmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWMgPSB0aGlzLnN0YXRlKHRzLCBzbik7XG4gICAgICAgICAgICAgICAgaWYgKHJlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjW3NuXSA9IHJlYztcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgfVxuXG4gICAgc3RhdGVfZGV0YWlsICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsnZnJvbSc6IG51bGwsICd0byc6IG51bGx9O1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyA9PT0gbnVsbCAmJiBuZXh0X3JlYyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc25dO1xuICAgICAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgfHwgbmV4dF9yZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCBbXSk7XG5cbiAgICB9XG5cbiAgICBiZXR3ZWVuIChmcm9tX3RzLCB0b190cywgZ3JlZWR5LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoZ3JlZWR5ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBncmVlZHkgPSBmYWxzZTtcblxuICAgICAgICBsZXQgc3RfbmFtZXMgPSBzdF9uYW1lID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gdGhpcy52YXJfbGlzdCgpXG4gICAgICAgICAgICA6IFtzdF9uYW1lXTtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0X25hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZXNbaV1dO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IGZyb21fdHN9KTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCAmJiAoZ3JlZWR5IHx8IGN1cl9yZWMudGltZXN0YW1wID09PSBmcm9tX3RzKSlcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB3aGlsZSAoKGN1cl9yZWMgPSBpdGVyLm5leHQoKSkgJiYgY3VyX3JlYy50aW1lc3RhbXAgPD0gdG9fdHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcy5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9hZGRfc3RhdGUgKHN0X25hbWUpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ25ld192YXInLCBzdF9uYW1lKTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW3N0X25hbWVdID0gbmV3IGJpbnRyZWVzLlJCVHJlZSh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2FkZCAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdhZGQnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0uaW5zZXJ0KGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfcmVtb3ZlIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ3JtJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLnJlbW92ZShjaGFuZ2UpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2NoYW5nZSAoY2hhbmdlLCBuZXdfdmFsKSB7XG5cbiAgICAgICAgbGV0IG9sZF92YWwgPSBjaGFuZ2UudmFsO1xuXG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogb2xkX3ZhbH0sIG5ld192YWwpO1xuICAgICAgICBjaGFuZ2UudmFsID0gbmV3X3ZhbDtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfY21wIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEudGltZXN0YW1wIDwgYi50aW1lc3RhbXAgPyAtMVxuICAgICAgICAgICAgOiBhLnRpbWVzdGFtcCA+IGIudGltZXN0YW1wID8gMVxuICAgICAgICAgICAgOiBhLm5hbWUgPCBiLm5hbWUgPyAtMVxuICAgICAgICAgICAgOiBhLm5hbWUgPiBiLm5hbWUgPyAxXG4gICAgICAgICAgICA6IDA7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgZGVmYXVsdCB0ZW1wb3JhbHN0YXRlO1xuIl19
//# sourceMappingURL=temporalstate_es5.js.map
