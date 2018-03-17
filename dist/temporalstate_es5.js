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
        key: 'add_change',
        value: function add_change(st_name, st_val, ts) {

            var states = this._states;

            if (states[st_name] === undefined) this._priv_add_state(st_name);

            var state = states[st_name];
            var iter = state.upperBound({ 'timestamp': ts });
            var next = iter.data();
            var cur = iter.prev();

            var transaction = [];

            if (cur === null) {
                transaction.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                this._priv_change_add({ 'timestamp': ts, 'name': st_name, 'val': st_val });
                if (next !== null && next.val === st_val) {
                    transaction.push({ 'rm': next });
                    this._priv_change_remove(next);
                }
            } else if (cur.timestamp === ts) {
                if (cur.val !== st_val) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) {
                            transaction.push({ 'remove': cur });
                            this._priv_change_remove(cur);
                        } else {
                            transaction.push({ 'change': cur, 'new_val': st_val });
                            this._priv_change_change(cur, st_val);
                        }
                        if (next !== null && next.val === st_val) {
                            transaction.push({ 'remove': next });
                            this._priv_change_remove(next);
                        }
                    } else if (prev.val === st_val) {
                        transaction.push({ 'remove': cur });
                        this._priv_change_remove(cur);
                        if (next !== null && next.val === st_val) {
                            transaction.push({ 'remove': next });
                            this._priv_change_remove(next);
                        }
                    } else {
                        transaction.push({ 'change': cur, 'new_val': st_val });
                        this._priv_change_change(cur, st_val);
                    }
                }
            } else if (cur.val !== st_val) {
                transaction.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                this._priv_change_add({ 'timestamp': ts, 'name': st_name, 'val': st_val });
            }

            this.emit('txn', { 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } }, transaction);
        }
    }, {
        key: 'remove_change',
        value: function remove_change(change) {

            var states = this._states;
            var state = states[change.name];

            if (state === undefined) return;

            var v = state.find(change);
            if (v !== null && v.val !== change.val) return;

            this._priv_change_remove(change);

            this.emit('txn', { 'remove': change }, [{ 'remove': change }]);
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
        value: function next(current) {

            var states = this._states;

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
        value: function prev(current) {

            var states = this._states;

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

            this._states[st_name] = new _bintrees2.default.RBTree(temporalstate.change_cmp);
            this.emit('new_var', st_name);
        }
    }, {
        key: '_priv_change_add',
        value: function _priv_change_add(change) {

            this._states[change.name].insert(change);
            this.emit('add', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
        }
    }, {
        key: '_priv_change_remove',
        value: function _priv_change_remove(change) {

            this._states[change.name].remove(change);
            this.emit('rm', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
        }
    }, {
        key: '_priv_change_change',
        value: function _priv_change_change(change, new_val) {

            var old_val = change.val;
            change.val = new_val;
            this.emit('change', { 'timestamp': change.timestamp, 'name': change.name, 'val': old_val }, new_val);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHJhbnNhY3Rpb24iLCJfcHJpdl9jaGFuZ2VfYWRkIiwidmFsIiwiX3ByaXZfY2hhbmdlX3JlbW92ZSIsInRpbWVzdGFtcCIsIl9wcml2X2NoYW5nZV9jaGFuZ2UiLCJlbWl0IiwiY2hhbmdlIiwibmFtZSIsImZpbmQiLCJmaXJzdF92YWxfY2hhbmdlcyIsImVhcmxpZXN0X3RpbWVzdGFtcCIsImxhc3RfdmFsX2NoYW5nZXMiLCJvbGRlc3RfdGltZXN0YW1wIiwiY3VycmVudCIsIm5leHRfdmFsX2NoYW5nZXMiLCJuZXh0X3RpbWVzdGFtcCIsInByZXZfdmFsX2NoYW5nZXMiLCJsb3dlckJvdW5kIiwicHJldl90aW1lc3RhbXAiLCJyZWMiLCJyZWR1Y2UiLCJhY2MiLCJuZXh0X3JlYyIsImN1cl9yZWMiLCJmcm9tX3RzIiwidG9fdHMiLCJncmVlZHkiLCJzdF9uYW1lcyIsInZhcl9saXN0IiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9sZF92YWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0lBR01BLGE7OztBQUVGLDZCQUFlO0FBQUE7O0FBQUE7O0FBSVgsY0FBS0MsT0FBTCxHQUFlLEVBQWY7O0FBSlc7QUFNZDs7OztzQ0FFYzs7QUFF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QUtELElBQUwsQ0FBVSxLQUFWLEVBQWlCLEVBQUMsYUFBYUMsT0FBT0gsU0FBckIsRUFBZ0MsUUFBUUcsT0FBT0MsSUFBL0MsRUFBcUQsT0FBT0QsT0FBT0wsR0FBbkUsRUFBakI7QUFFSDs7OzRDQUVvQkssTSxFQUFROztBQUV6QixpQkFBS3RDLE9BQUwsQ0FBYXNDLE9BQU9DLElBQXBCLEVBQTBCd0IsTUFBMUIsQ0FBaUN6QixNQUFqQztBQUNBLGlCQUFLRCxJQUFMLENBQVUsSUFBVixFQUFnQixFQUFDLGFBQWFDLE9BQU9ILFNBQXJCLEVBQWdDLFFBQVFHLE9BQU9DLElBQS9DLEVBQXFELE9BQU9ELE9BQU9MLEdBQW5FLEVBQWhCO0FBRUg7Ozs0Q0FFb0JLLE0sRUFBUTBCLE8sRUFBUzs7QUFFbEMsZ0JBQUlDLFVBQVUzQixPQUFPTCxHQUFyQjtBQUNBSyxtQkFBT0wsR0FBUCxHQUFhK0IsT0FBYjtBQUNBLGlCQUFLM0IsSUFBTCxDQUFVLFFBQVYsRUFBb0IsRUFBQyxhQUFhQyxPQUFPSCxTQUFyQixFQUFnQyxRQUFRRyxPQUFPQyxJQUEvQyxFQUFxRCxPQUFPMEIsT0FBNUQsRUFBcEIsRUFBMEZELE9BQTFGO0FBRUg7OzttQ0FFa0JsRCxDLEVBQUdDLEMsRUFBRzs7QUFFckIsbUJBQU9ELEVBQUVxQixTQUFGLEdBQWNwQixFQUFFb0IsU0FBaEIsR0FBNEIsQ0FBQyxDQUE3QixHQUNEckIsRUFBRXFCLFNBQUYsR0FBY3BCLEVBQUVvQixTQUFoQixHQUE0QixDQUE1QixHQUNBckIsRUFBRXlCLElBQUYsR0FBU3hCLEVBQUV3QixJQUFYLEdBQWtCLENBQUMsQ0FBbkIsR0FDQXpCLEVBQUV5QixJQUFGLEdBQVN4QixFQUFFd0IsSUFBWCxHQUFrQixDQUFsQixHQUNBLENBSk47QUFNSDs7Ozs7O2tCQUtVeEMsYSIsImZpbGUiOiJ0ZW1wb3JhbHN0YXRlX2VzNS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBiaW50cmVlcyBmcm9tICdiaW50cmVlcyc7XG5pbXBvcnQgZXZlbnRfZW1pdHRlciBmcm9tICdldmVudHMnO1xuXG5cbmNsYXNzIHRlbXBvcmFsc3RhdGUgZXh0ZW5kcyBldmVudF9lbWl0dGVyIHtcblxuICAgIGNvbnN0cnVjdG9yICgpIHtcblxuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuXG4gICAgfVxuXG4gICAgY2hhbmdlX2xpc3QgKCkge1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IHZhbF9pdGVyX2dycCA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IFtpLm5leHQoKSwgaV0pXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgd2hpbGUgKHZhbF9pdGVyX2dycC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgdiA9IHZhbF9pdGVyX2dycFswXVswXTtcbiAgICAgICAgICAgIGxldCBpID0gdmFsX2l0ZXJfZ3JwWzBdWzFdO1xuICAgICAgICAgICAgY2hhbmdlcy5wdXNoKHYpO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwWzBdID0gW2kubmV4dCgpLCBpXTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycCA9IHZhbF9pdGVyX2dycFxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGEpID0+IGFbMF0gIT09IG51bGwpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcztcblxuICAgIH1cblxuICAgIGFkZF9jaGFuZ2UgKHN0X25hbWUsIHN0X3ZhbCwgdHMpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0YXRlc1tzdF9uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhpcy5fcHJpdl9hZGRfc3RhdGUoc3RfbmFtZSk7XG5cbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoeyd0aW1lc3RhbXAnOiB0c30pO1xuICAgICAgICBsZXQgbmV4dCA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICBsZXQgY3VyID0gaXRlci5wcmV2KCk7XG5cbiAgICAgICAgbGV0IHRyYW5zYWN0aW9uID0gW107XG5cbiAgICAgICAgaWYgKGN1ciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX2FkZCh7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncm0nOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci50aW1lc3RhbXAgPT09IHRzKSB7XG4gICAgICAgICAgICBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByZXYgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RfdmFsID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUoY3VyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UoY3VyLCBzdF92YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByZXYudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUoY3VyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZShjdXIsIHN0X3ZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX2FkZCh7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuJywgeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSwgdHJhbnNhY3Rpb24pO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW2NoYW5nZS5uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsZXQgdiA9IHN0YXRlLmZpbmQoY2hhbmdlKTtcbiAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgdi52YWwgIT09IGNoYW5nZS52YWwpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjaGFuZ2UpO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuJywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG5cbiAgICB9XG5cbiAgICB2YXJfbGlzdCAoKSB7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRlcykuc29ydCgpO1xuXG4gICAgfVxuXG4gICAgZmlyc3QgKCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IGZpcnN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5uZXh0KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAoZmlyc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBlYXJsaWVzdF90aW1lc3RhbXAgPSBmaXJzdF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBmaXJzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBlYXJsaWVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbGFzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50KSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50KSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgcHJldl92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0ubG93ZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGkucHJldigpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChwcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgcHJldl90aW1lc3RhbXAgPSBwcmV2X3ZhbF9jaGFuZ2VzW3ByZXZfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gcHJldl92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBwcmV2X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBhdCAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5maW5kKHsndGltZXN0YW1wJzogdGltZXN0YW1wfSkpXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIGFmdGVyICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5uZXh0KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBiZWZvcmUgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLnByZXYoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIHN0YXRlICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCByZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIHJldHVybiByZWMgPT09IG51bGwgPyBudWxsIDogcmVjLnZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVjID0gdGhpcy5zdGF0ZSh0cywgc24pO1xuICAgICAgICAgICAgICAgIGlmIChyZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjY1tzbl0gPSByZWM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgIH1cblxuICAgIHN0YXRlX2RldGFpbCAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB7J2Zyb20nOiBudWxsLCAndG8nOiBudWxsfTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgPT09IG51bGwgJiYgbmV4dF9yZWMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3NuXTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsIHx8IG5leHRfcmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwgW10pO1xuXG4gICAgfVxuXG4gICAgYmV0d2VlbiAoZnJvbV90cywgdG9fdHMsIGdyZWVkeSwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKGdyZWVkeSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZ3JlZWR5ID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IHN0X25hbWVzID0gc3RfbmFtZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHRoaXMudmFyX2xpc3QoKVxuICAgICAgICAgICAgOiBbc3RfbmFtZV07XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdF9uYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVzW2ldXTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiBmcm9tX3RzfSk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgJiYgKGdyZWVkeSB8fCBjdXJfcmVjLnRpbWVzdGFtcCA9PT0gZnJvbV90cykpXG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgd2hpbGUgKChjdXJfcmVjID0gaXRlci5uZXh0KCkpICYmIGN1cl9yZWMudGltZXN0YW1wIDw9IHRvX3RzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXMuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfYWRkX3N0YXRlIChzdF9uYW1lKSB7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzW3N0X25hbWVdID0gbmV3IGJpbnRyZWVzLlJCVHJlZSh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICB0aGlzLmVtaXQoJ25ld192YXInLCBzdF9uYW1lKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9hZGQgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0uaW5zZXJ0KGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgnYWRkJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX3JlbW92ZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5yZW1vdmUoY2hhbmdlKTtcbiAgICAgICAgdGhpcy5lbWl0KCdybScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9jaGFuZ2UgKGNoYW5nZSwgbmV3X3ZhbCkge1xuXG4gICAgICAgIGxldCBvbGRfdmFsID0gY2hhbmdlLnZhbDtcbiAgICAgICAgY2hhbmdlLnZhbCA9IG5ld192YWw7XG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogb2xkX3ZhbH0sIG5ld192YWwpO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV9jbXAgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYS50aW1lc3RhbXAgPCBiLnRpbWVzdGFtcCA/IC0xXG4gICAgICAgICAgICA6IGEudGltZXN0YW1wID4gYi50aW1lc3RhbXAgPyAxXG4gICAgICAgICAgICA6IGEubmFtZSA8IGIubmFtZSA/IC0xXG4gICAgICAgICAgICA6IGEubmFtZSA+IGIubmFtZSA/IDFcbiAgICAgICAgICAgIDogMDtcblxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHRlbXBvcmFsc3RhdGU7XG4iXX0=
//# sourceMappingURL=temporalstate_es5.js.map
