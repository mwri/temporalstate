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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHJhbnNhY3Rpb24iLCJfcHJpdl9jaGFuZ2VfYWRkIiwidmFsIiwiX3ByaXZfY2hhbmdlX3JlbW92ZSIsInRpbWVzdGFtcCIsIl9wcml2X2NoYW5nZV9jaGFuZ2UiLCJlbWl0IiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJjaGFuZ2UiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJwcmV2X3ZhbF9jaGFuZ2VzIiwibG93ZXJCb3VuZCIsInByZXZfdGltZXN0YW1wIiwiZmluZCIsInJlYyIsInJlZHVjZSIsImFjYyIsIm5leHRfcmVjIiwiY3VyX3JlYyIsIlJCVHJlZSIsIm5hbWUiLCJpbnNlcnQiLCJyZW1vdmUiLCJuZXdfdmFsIiwib2xkX3ZhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFHTUEsYTs7O0FBRUYsNkJBQWU7QUFBQTs7QUFBQTs7QUFJWCxjQUFLQyxPQUFMLEdBQWUsRUFBZjs7QUFKVztBQU1kOzs7O3NDQUVjOztBQUVYLGdCQUFJQyxVQUFVLEVBQWQ7QUFDQSxnQkFBSUMsU0FBUyxLQUFLRixPQUFsQjs7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LEVBQWdCLEVBQUMsYUFBYUcsT0FBT0wsU0FBckIsRUFBZ0MsUUFBUUssT0FBT2dCLElBQS9DLEVBQXFELE9BQU9oQixPQUFPUCxHQUFuRSxFQUFoQjtBQUVIOzs7NENBRW9CTyxNLEVBQVFtQixPLEVBQVM7O0FBRWxDLGdCQUFJQyxVQUFVcEIsT0FBT1AsR0FBckI7QUFDQU8sbUJBQU9QLEdBQVAsR0FBYTBCLE9BQWI7QUFDQSxpQkFBS3RCLElBQUwsQ0FBVSxRQUFWLEVBQW9CLEVBQUMsYUFBYUcsT0FBT0wsU0FBckIsRUFBZ0MsUUFBUUssT0FBT2dCLElBQS9DLEVBQXFELE9BQU9JLE9BQTVELEVBQXBCLEVBQTBGRCxPQUExRjtBQUVIOzs7bUNBRWtCN0MsQyxFQUFHQyxDLEVBQUc7O0FBRXJCLG1CQUFPRCxFQUFFcUIsU0FBRixHQUFjcEIsRUFBRW9CLFNBQWhCLEdBQTRCLENBQUMsQ0FBN0IsR0FDRHJCLEVBQUVxQixTQUFGLEdBQWNwQixFQUFFb0IsU0FBaEIsR0FBNEIsQ0FBNUIsR0FDQXJCLEVBQUUwQyxJQUFGLEdBQVN6QyxFQUFFeUMsSUFBWCxHQUFrQixDQUFDLENBQW5CLEdBQ0ExQyxFQUFFMEMsSUFBRixHQUFTekMsRUFBRXlDLElBQVgsR0FBa0IsQ0FBbEIsR0FDQSxDQUpOO0FBTUg7Ozs7OztrQkFLVXpELGEiLCJmaWxlIjoidGVtcG9yYWxzdGF0ZV9lczUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuaW1wb3J0IGV2ZW50X2VtaXR0ZXIgZnJvbSAnZXZlbnRzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIGV4dGVuZHMgZXZlbnRfZW1pdHRlciB7XG5cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMgPSB7fTtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChzdF9uYW1lLCBzdF92YWwsIHRzKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgXG4gICAgICAgIGlmIChzdGF0ZXNbc3RfbmFtZV0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHRoaXMuX3ByaXZfYWRkX3N0YXRlKHN0X25hbWUpO1xuXG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHsndGltZXN0YW1wJzogdHN9KTtcbiAgICAgICAgbGV0IG5leHQgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgbGV0IGN1ciA9IGl0ZXIucHJldigpO1xuXG4gICAgICAgIGxldCB0cmFuc2FjdGlvbiA9IFtdO1xuXG4gICAgICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9hZGQoeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShuZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGN1cik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlKGN1ciwgc3RfdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGN1cik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UoY3VyLCBzdF92YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9hZGQoeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmVtaXQoJ3R4bicsIHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0sIHRyYW5zYWN0aW9uKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgZmlyc3RfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBpLm5leHQoKSlcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChmaXJzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IGVhcmxpZXN0X3RpbWVzdGFtcCA9IGZpcnN0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGZpcnN0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IGVhcmxpZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBsYXN0ICgpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBuZXh0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS51cHBlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKVxuICAgICAgICAgICAgICAgICAgICBpLm5leHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobmV4dF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG5leHRfdGltZXN0YW1wID0gbmV4dF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBuZXh0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IG5leHRfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIHByZXYgKGN1cnJlbnQpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGF0ICh0aW1lc3RhbXApIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmZpbmQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgYWZ0ZXIgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLm5leHQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIGJlZm9yZSAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJldih7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgc3RhdGUgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IHJlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYyA9PT0gbnVsbCA/IG51bGwgOiByZWMudmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWMgPSB0aGlzLnN0YXRlKHRzLCBzbik7XG4gICAgICAgICAgICAgICAgaWYgKHJlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjW3NuXSA9IHJlYztcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgfVxuXG4gICAgc3RhdGVfZGV0YWlsICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsnZnJvbSc6IG51bGwsICd0byc6IG51bGx9O1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyA9PT0gbnVsbCAmJiBuZXh0X3JlYyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc25dO1xuICAgICAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgfHwgbmV4dF9yZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCBbXSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9hZGRfc3RhdGUgKHN0X25hbWUpIHtcblxuICAgICAgICB0aGlzLl9zdGF0ZXNbc3RfbmFtZV0gPSBuZXcgYmludHJlZXMuUkJUcmVlKHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIHRoaXMuZW1pdCgnbmV3X3ZhcicsIHN0X25hbWUpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2FkZCAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5pbnNlcnQoY2hhbmdlKTtcbiAgICAgICAgdGhpcy5lbWl0KCdhZGQnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfcmVtb3ZlIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLnJlbW92ZShjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ3JtJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2NoYW5nZSAoY2hhbmdlLCBuZXdfdmFsKSB7XG5cbiAgICAgICAgbGV0IG9sZF92YWwgPSBjaGFuZ2UudmFsO1xuICAgICAgICBjaGFuZ2UudmFsID0gbmV3X3ZhbDtcbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBvbGRfdmFsfSwgbmV3X3ZhbCk7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX2NtcCAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhLnRpbWVzdGFtcCA8IGIudGltZXN0YW1wID8gLTFcbiAgICAgICAgICAgIDogYS50aW1lc3RhbXAgPiBiLnRpbWVzdGFtcCA/IDFcbiAgICAgICAgICAgIDogYS5uYW1lIDwgYi5uYW1lID8gLTFcbiAgICAgICAgICAgIDogYS5uYW1lID4gYi5uYW1lID8gMVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgdGVtcG9yYWxzdGF0ZTtcbiJdfQ==
//# sourceMappingURL=temporalstate_es5.js.map
