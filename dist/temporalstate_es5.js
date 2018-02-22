'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bintrees = require('bintrees');

var _bintrees2 = _interopRequireDefault(_bintrees);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var temporalstate = function () {
    function temporalstate() {
        _classCallCheck(this, temporalstate);

        this._states = {};
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

            if (states[st_name] === undefined) states[st_name] = new _bintrees2.default.RBTree(temporalstate.change_cmp);

            var state = states[st_name];
            var iter = state.upperBound({ 'timestamp': ts });
            var next = iter.data();
            var cur = iter.prev();

            if (cur === null) {
                state.insert({ 'timestamp': ts, 'name': st_name, 'val': st_val });
                if (next !== null && next.val === st_val) state.remove(next);
            } else if (cur.timestamp === ts) {
                if (cur.val !== st_val) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) state.remove(cur);else cur.val = st_val;
                        if (next !== null && next.val === st_val) state.remove(next);
                    } else if (prev.val === st_val) {
                        state.remove(cur);
                        if (next !== null && next.val === st_val) state.remove(next);
                    } else {
                        cur.val = st_val;
                    }
                }
            } else if (cur.val !== st_val) {
                state.insert({ 'timestamp': ts, 'name': st_name, 'val': st_val });
            }
        }
    }, {
        key: 'state',
        value: function state(ts, st_name) {
            var _this = this;

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
                var rec = _this.state(ts, sn);
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
    }], [{
        key: 'change_cmp',
        value: function change_cmp(a, b) {

            return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        }
    }]);

    return temporalstate;
}();

exports.default = temporalstate;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiUkJUcmVlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwiaW5zZXJ0IiwidmFsIiwicmVtb3ZlIiwidGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwibmFtZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7SUFHTUEsYTtBQUVGLDZCQUFlO0FBQUE7O0FBRVgsYUFBS0MsT0FBTCxHQUFlLEVBQWY7QUFFSDs7OztzQ0FFYzs7QUFFWCxnQkFBSUMsVUFBVSxFQUFkO0FBQ0EsZ0JBQUlDLFNBQVMsS0FBS0YsT0FBbEI7O0FBRUEsZ0JBQUlHLGVBQWVDLE9BQU9DLElBQVAsQ0FBWUgsTUFBWixFQUNkSSxNQURjLENBQ1AsVUFBQ0MsRUFBRDtBQUFBLHVCQUFRTCxPQUFPSyxFQUFQLEVBQVdDLElBQVgsR0FBa0IsQ0FBMUI7QUFBQSxhQURPLEVBRWRDLEdBRmMsQ0FFVixVQUFDRixFQUFEO0FBQUEsdUJBQVFMLE9BQU9LLEVBQVAsRUFBV0csUUFBWCxFQUFSO0FBQUEsYUFGVSxFQUdkRCxHQUhjLENBR1YsVUFBQ0UsQ0FBRDtBQUFBLHVCQUFPLENBQUNBLEVBQUVDLElBQUYsRUFBRCxFQUFXRCxDQUFYLENBQVA7QUFBQSxhQUhVLEVBSWRFLElBSmMsQ0FJVCxVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSx1QkFBVWhCLGNB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bnRyZWVzJztcblxuXG5jbGFzcyB0ZW1wb3JhbHN0YXRlIHtcblxuICAgIGNvbnN0cnVjdG9yICgpIHtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMgPSB7fTtcblxuICAgIH1cblxuICAgIGNoYW5nZV9saXN0ICgpIHtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCB2YWxfaXRlcl9ncnAgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBbaS5uZXh0KCksIGldKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIHdoaWxlICh2YWxfaXRlcl9ncnAubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbGV0IHYgPSB2YWxfaXRlcl9ncnBbMF1bMF07XG4gICAgICAgICAgICBsZXQgaSA9IHZhbF9pdGVyX2dycFswXVsxXTtcbiAgICAgICAgICAgIGNoYW5nZXMucHVzaCh2KTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycFswXSA9IFtpLm5leHQoKSwgaV07XG4gICAgICAgICAgICB2YWxfaXRlcl9ncnAgPSB2YWxfaXRlcl9ncnBcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChhKSA9PiBhWzBdICE9PSBudWxsKVxuICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXAoYVswXSwgYlswXSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXM7XG5cbiAgICB9XG5cbiAgICBhZGRfY2hhbmdlIChzdF9uYW1lLCBzdF92YWwsIHRzKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgXG4gICAgICAgIGlmIChzdGF0ZXNbc3RfbmFtZV0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHN0YXRlc1tzdF9uYW1lXSA9IG5ldyBiaW50cmVlcy5SQlRyZWUodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7J3RpbWVzdGFtcCc6IHRzfSk7XG4gICAgICAgIGxldCBuZXh0ID0gaXRlci5kYXRhKCk7XG4gICAgICAgIGxldCBjdXIgPSBpdGVyLnByZXYoKTtcblxuICAgICAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgICAgICBzdGF0ZS5pbnNlcnQoeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKVxuICAgICAgICAgICAgICAgIHN0YXRlLnJlbW92ZShuZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChjdXIudGltZXN0YW1wID09PSB0cykge1xuICAgICAgICAgICAgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgIGxldCBwcmV2ID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXYgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0X3ZhbCA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLnJlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXIudmFsID0gc3RfdmFsO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUucmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJldi52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5yZW1vdmUoY3VyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLnJlbW92ZShuZXh0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjdXIudmFsID0gc3RfdmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXIudmFsICE9PSBzdF92YWwpIHtcbiAgICAgICAgICAgIHN0YXRlLmluc2VydCh7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgc3RhdGUgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IHJlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYyA9PT0gbnVsbCA/IG51bGwgOiByZWMudmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWMgPSB0aGlzLnN0YXRlKHRzLCBzbik7XG4gICAgICAgICAgICAgICAgaWYgKHJlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjW3NuXSA9IHJlYztcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgfVxuXG4gICAgc3RhdGVfZGV0YWlsICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsnZnJvbSc6IG51bGwsICd0byc6IG51bGx9O1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyA9PT0gbnVsbCAmJiBuZXh0X3JlYyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc25dO1xuICAgICAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgfHwgbmV4dF9yZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCBbXSk7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX2NtcCAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhLnRpbWVzdGFtcCA8IGIudGltZXN0YW1wID8gLTFcbiAgICAgICAgICAgIDogYS50aW1lc3RhbXAgPiBiLnRpbWVzdGFtcCA/IDFcbiAgICAgICAgICAgIDogYS5uYW1lIDwgYi5uYW1lID8gLTFcbiAgICAgICAgICAgIDogYS5uYW1lID4gYi5uYW1lID8gMVxuICAgICAgICAgICAgOiAwO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgdGVtcG9yYWxzdGF0ZTtcbiJdfQ==
//# sourceMappingURL=temporalstate_es5.js.map
