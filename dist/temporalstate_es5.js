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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHJhbnNhY3Rpb24iLCJfcHJpdl9jaGFuZ2VfYWRkIiwidmFsIiwiX3ByaXZfY2hhbmdlX3JlbW92ZSIsInRpbWVzdGFtcCIsIl9wcml2X2NoYW5nZV9jaGFuZ2UiLCJlbWl0IiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJjaGFuZ2UiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJwcmV2X3ZhbF9jaGFuZ2VzIiwibG93ZXJCb3VuZCIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwiUkJUcmVlIiwibmFtZSIsImluc2VydCIsInJlbW92ZSIsIm5ld192YWwiLCJvbGRfdmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7Ozs7Ozs7OztJQUdNQSxhOzs7QUFFRiw2QkFBZTtBQUFBOztBQUFBOztBQUlYLGNBQUtDLE9BQUwsR0FBZSxFQUFmOztBQUpXO0FBTWQ7Ozs7c0NBRWM7O0FBRVgsZ0JBQUlDLFVBQVUsRUFBZDtBQUNBLGdCQUFJQyxTQUFTLEtBQUtGLE9BQWxCOztBQUVBLGdC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LEdBQWtCLENBQWxCLEdBQ0EsQ0FKTjtBQU1IOzs7Ozs7a0JBS1V4RCxhIiwiZmlsZSI6InRlbXBvcmFsc3RhdGVfZXM1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGJpbnRyZWVzIGZyb20gJ2JpbnRyZWVzJztcbmltcG9ydCBldmVudF9lbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cblxuY2xhc3MgdGVtcG9yYWxzdGF0ZSBleHRlbmRzIGV2ZW50X2VtaXR0ZXIge1xuXG4gICAgY29uc3RydWN0b3IgKCkge1xuXG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzID0ge307XG5cbiAgICB9XG5cbiAgICBjaGFuZ2VfbGlzdCAoKSB7XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgdmFsX2l0ZXJfZ3JwID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gW2kubmV4dCgpLCBpXSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB3aGlsZSAodmFsX2l0ZXJfZ3JwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxldCB2ID0gdmFsX2l0ZXJfZ3JwWzBdWzBdO1xuICAgICAgICAgICAgbGV0IGkgPSB2YWxfaXRlcl9ncnBbMF1bMV07XG4gICAgICAgICAgICBjaGFuZ2VzLnB1c2godik7XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnBbMF0gPSBbaS5uZXh0KCksIGldO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwID0gdmFsX2l0ZXJfZ3JwXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoYSkgPT4gYVswXSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VzO1xuXG4gICAgfVxuXG4gICAgYWRkX2NoYW5nZSAoc3RfbmFtZSwgc3RfdmFsLCB0cykge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3RhdGVzW3N0X25hbWVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLl9wcml2X2FkZF9zdGF0ZShzdF9uYW1lKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7J3RpbWVzdGFtcCc6IHRzfSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBsZXQgdHJhbnNhY3Rpb24gPSBbXTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfYWRkKHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUobmV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnRpbWVzdGFtcCA9PT0gdHMpIHtcbiAgICAgICAgICAgIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICBsZXQgcHJldiA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdF92YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zYWN0aW9uLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZShjdXIsIHN0X3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldi52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNhY3Rpb24ucHVzaCh7J2NoYW5nZSc6IGN1ciwgJ25ld192YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlKGN1ciwgc3RfdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICB0cmFuc2FjdGlvbi5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfYWRkKHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG4nLCB7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19LCB0cmFuc2FjdGlvbik7XG5cbiAgICB9XG5cbiAgICB2YXJfbGlzdCAoKSB7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0YXRlcykuc29ydCgpO1xuXG4gICAgfVxuXG4gICAgZmlyc3QgKCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IGZpcnN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5uZXh0KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAoZmlyc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBlYXJsaWVzdF90aW1lc3RhbXAgPSBmaXJzdF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBmaXJzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBlYXJsaWVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbGFzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50KSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgbmV4dF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0udXBwZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcClcbiAgICAgICAgICAgICAgICAgICAgaS5uZXh0KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKG5leHRfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBuZXh0X3RpbWVzdGFtcCA9IG5leHRfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbmV4dF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBuZXh0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBwcmV2IChjdXJyZW50KSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgcHJldl92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0ubG93ZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGkucHJldigpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChwcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgcHJldl90aW1lc3RhbXAgPSBwcmV2X3ZhbF9jaGFuZ2VzW3ByZXZfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gcHJldl92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBwcmV2X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZSAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjID09PSBudWxsID8gbnVsbCA6IHJlYy52YWw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHJlYyA9IHRoaXMuc3RhdGUodHMsIHNuKTtcbiAgICAgICAgICAgICAgICBpZiAocmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2Nbc25dID0gcmVjO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCB7fSk7XG5cbiAgICB9XG5cbiAgICBzdGF0ZV9kZXRhaWwgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4geydmcm9tJzogbnVsbCwgJ3RvJzogbnVsbH07XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIGlmIChjdXJfcmVjID09PSBudWxsICYmIG5leHRfcmVjID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzbl07XG4gICAgICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICAgICAgbGV0IGN1cl9yZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCB8fCBuZXh0X3JlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3RvJzogbmV4dF9yZWNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIFtdKTtcblxuICAgIH1cblxuICAgIF9wcml2X2FkZF9zdGF0ZSAoc3RfbmFtZSkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlc1tzdF9uYW1lXSA9IG5ldyBiaW50cmVlcy5SQlRyZWUodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgdGhpcy5lbWl0KCduZXdfdmFyJywgc3RfbmFtZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfYWRkIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLmluc2VydChjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ2FkZCcsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9yZW1vdmUgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0ucmVtb3ZlKGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgncm0nLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfY2hhbmdlIChjaGFuZ2UsIG5ld192YWwpIHtcblxuICAgICAgICBsZXQgb2xkX3ZhbCA9IGNoYW5nZS52YWw7XG4gICAgICAgIGNoYW5nZS52YWwgPSBuZXdfdmFsO1xuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IG9sZF92YWx9LCBuZXdfdmFsKTtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfY21wIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEudGltZXN0YW1wIDwgYi50aW1lc3RhbXAgPyAtMVxuICAgICAgICAgICAgOiBhLnRpbWVzdGFtcCA+IGIudGltZXN0YW1wID8gMVxuICAgICAgICAgICAgOiBhLm5hbWUgPCBiLm5hbWUgPyAtMVxuICAgICAgICAgICAgOiBhLm5hbWUgPiBiLm5hbWUgPyAxXG4gICAgICAgICAgICA6IDA7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgZGVmYXVsdCB0ZW1wb3JhbHN0YXRlO1xuIl19
//# sourceMappingURL=temporalstate_es5.js.map
