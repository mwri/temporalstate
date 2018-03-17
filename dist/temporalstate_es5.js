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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHJhbnNhY3Rpb24iLCJfcHJpdl9jaGFuZ2VfYWRkIiwidmFsIiwiX3ByaXZfY2hhbmdlX3JlbW92ZSIsInRpbWVzdGFtcCIsIl9wcml2X2NoYW5nZV9jaGFuZ2UiLCJlbWl0IiwiY2hhbmdlIiwibmFtZSIsImZpbmQiLCJmaXJzdF92YWxfY2hhbmdlcyIsImVhcmxpZXN0X3RpbWVzdGFtcCIsImxhc3RfdmFsX2NoYW5nZXMiLCJvbGRlc3RfdGltZXN0YW1wIiwiY3VycmVudCIsIm5leHRfdmFsX2NoYW5nZXMiLCJuZXh0X3RpbWVzdGFtcCIsImxvd2VyQm91bmQiLCJwcmV2X3ZhbF9jaGFuZ2VzIiwicHJldl90aW1lc3RhbXAiLCJyZWMiLCJyZWR1Y2UiLCJhY2MiLCJuZXh0X3JlYyIsImN1cl9yZWMiLCJmcm9tX3RzIiwidG9fdHMiLCJncmVlZHkiLCJzdF9uYW1lcyIsInZhcl9saXN0IiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9sZF92YWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0lBR01BLGE7OztBQUVGLDZCQUFlO0FBQUE7O0FBQUE7O0FBSVgsY0FBS0MsT0FBTCxHQUFlLEVBQWY7O0FBSlc7QUFNZDs7OztzQ0FFYzs7QUFF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UUcsT0FBT0MsSUFBL0MsRUFBcUQsT0FBTzBCLE9BQTVELEVBQXBCLEVBQTBGRCxPQUExRjtBQUVIOzs7bUNBRWtCbEQsQyxFQUFHQyxDLEVBQUc7O0FBRXJCLG1CQUFPRCxFQUFFcUIsU0FBRixHQUFjcEIsRUFBRW9CLFNBQWhCLEdBQTRCLENBQUMsQ0FBN0IsR0FDRHJCLEVBQUVxQixTQUFGLEdBQWNwQixFQUFFb0IsU0FBaEIsR0FBNEIsQ0FBNUIsR0FDQXJCLEVBQUV5QixJQUFGLEdBQVN4QixFQUFFd0IsSUFBWCxHQUFrQixDQUFDLENBQW5CLEdBQ0F6QixFQUFFeUIsSUFBRixHQUFTeEIsRUFBRXdCLElBQVgsR0FBa0IsQ0FBbEIsR0FDQSxDQUpOO0FBTUg7Ozs7OztrQkFLVXhDLGEiLCJmaWxlIjoidGVtcG9yYWxzdGF0ZV9lczUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuaW1wb3J0IGV2ZW50X2VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIGV4dGVuZHMgZXZlbnRfZW1pdHRlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMgPSB7fTtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChzdF9uYW1lLCBzdF92YWwsIHRzKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RhdGVzW3N0X25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLl9wcml2X2FkZF9zdGF0ZShzdF9uYW1lKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7J3RpbWVzdGFtcCc6IHRzfSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBbXTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfYWRkKHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUobmV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnRpbWVzdGFtcCA9PT0gdHMpIHtcbiAgICAgICAgICAgIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICBsZXQgcHJldiA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdF92YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZShjdXIsIHN0X3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldi52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlKGN1ciwgc3RfdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfYWRkKHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG4nLCB7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19LCB0cmFuc2FjdGlvbik7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbY2hhbmdlLm5hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2ID0gc3RhdGUuZmluZChjaGFuZ2UpO1xuICAgICAgICBpZiAodiAhPT0gbnVsbCAmJiB2LnZhbCAhPT0gY2hhbmdlLnZhbClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGNoYW5nZSk7XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG4nLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgZmlyc3RfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBpLm5leHQoKSlcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChmaXJzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IGVhcmxpZXN0X3RpbWVzdGFtcCA9IGZpcnN0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGZpcnN0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IGVhcmxpZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBsYXN0ICgpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudXBwZXJCb3VuZChjdXJyZW50KS5kYXRhKCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS5sb3dlckJvdW5kKGN1cnJlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXIucHJldigpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHByZXZfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmxvd2VyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpLnByZXYoKTtcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAocHJldl92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IHByZXZfdGltZXN0YW1wID0gcHJldl92YWxfY2hhbmdlc1twcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIHByZXZfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gcHJldl90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgYXQgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uZmluZCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBhZnRlciAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dCh7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgYmVmb3JlICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5wcmV2KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZSAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjID09PSBudWxsID8gbnVsbCA6IHJlYy52YWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlYyA9IHRoaXMuc3RhdGUodHMsIHNuKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2Nbc25dID0gcmVjO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZV9kZXRhaWwgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4geydmcm9tJzogbnVsbCwgJ3RvJzogbnVsbH07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjID09PSBudWxsICYmIG5leHRfcmVjID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzbl07XG4gICAgICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCB8fCBuZXh0X3JlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIFtdKTtcblxuICAgIH1cblxuICAgIGJldHdlZW4gKGZyb21fdHMsIHRvX3RzLCBncmVlZHksIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChncmVlZHkgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIGdyZWVkeSA9IGZhbHNlO1xuXG4gICAgICAgIGxldCBzdF9uYW1lcyA9IHN0X25hbWUgPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB0aGlzLnZhcl9saXN0KClcbiAgICAgICAgICAgIDogW3N0X25hbWVdO1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RfbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lc1tpXV07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogZnJvbV90c30pO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsICYmIChncmVlZHkgfHwgY3VyX3JlYy50aW1lc3RhbXAgPT09IGZyb21fdHMpKVxuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIHdoaWxlICgoY3VyX3JlYyA9IGl0ZXIubmV4dCgpKSAmJiBjdXJfcmVjLnRpbWVzdGFtcCA8PSB0b190cykge1xuICAgICAgICAgICAgICAgIGNoYW5nZXMucHVzaChjdXJfcmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIF9wcml2X2FkZF9zdGF0ZSAoc3RfbmFtZSkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlc1tzdF9uYW1lXSA9IG5ldyBiaW50cmVlcy5SQlRyZWUodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgdGhpcy5lbWl0KCduZXdfdmFyJywgc3RfbmFtZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfYWRkIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLmluc2VydChjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ2FkZCcsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9yZW1vdmUgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0ucmVtb3ZlKGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgncm0nLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfY2hhbmdlIChjaGFuZ2UsIG5ld192YWwpIHtcblxuICAgICAgICBsZXQgb2xkX3ZhbCA9IGNoYW5nZS52YWw7XG4gICAgICAgIGNoYW5nZS52YWwgPSBuZXdfdmFsO1xuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IG9sZF92YWx9LCBuZXdfdmFsKTtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfY21wIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEudGltZXN0YW1wIDwgYi50aW1lc3RhbXAgPyAtMVxuICAgICAgICAgICAgOiBhLnRpbWVzdGFtcCA+IGIudGltZXN0YW1wID8gMVxuICAgICAgICAgICAgOiBhLm5hbWUgPCBiLm5hbWUgPyAtMVxuICAgICAgICAgICAgOiBhLm5hbWUgPiBiLm5hbWUgPyAxXG4gICAgICAgICAgICA6IDA7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgZGVmYXVsdCB0ZW1wb3JhbHN0YXRlO1xuIl19
//# sourceMappingURL=temporalstate_es5.js.map
