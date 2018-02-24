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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwic3RfbmFtZSIsInN0X3ZhbCIsInRzIiwidW5kZWZpbmVkIiwiUkJUcmVlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwiaW5zZXJ0IiwidmFsIiwicmVtb3ZlIiwidGltZXN0YW1wIiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJjaGFuZ2UiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJwcmV2X3ZhbF9jaGFuZ2VzIiwibG93ZXJCb3VuZCIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwibmFtZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7SUFHTUEsYTtBQUVGLDZCQUFlO0FBQUE7O0FBRVgsYUFBS0MsT0FBTCxHQUFlLEVBQWY7QUFFSDs7OztzQ0FFYzs7QUFFWCxnQkFBSUMsVUFBVSxFQUFkO0FBQ0EsZ0JBQUlDLFNBQVMsS0FBS0YsT0FBbEI7O0FBRUEsZ0JBQUlHLGVBQWVDLE9BQU9DLElBQVAsQ0FBWUgsTUFBWixFQUNkSSxNQURjLENBQ1AsVUFBQ0MsRUFBRDtBQUFBLHVCQUFRTCxPQUFPSyxFQUFQLEVBQVdDLElBQVgsR0FBa0IsQ0FBMUI7QUFBQSxhQURPLEVBRWRDLEdBRmMsQ0FFVixVQUFDRixFQUFEO0FBQUEs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QUFrQixDQUFDLENBQW5CLEdBQ0FyQyxFQUFFcUMsSUFBRixHQUFTcEMsRUFBRW9DLElBQVgsR0FBa0IsQ0FBbEIsR0FDQSxDQUpOO0FBTUg7Ozs7OztrQkFLVXBELGEiLCJmaWxlIjoidGVtcG9yYWxzdGF0ZV9lczUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYmludHJlZXMgZnJvbSAnYmludHJlZXMnO1xuXG5cbmNsYXNzIHRlbXBvcmFsc3RhdGUge1xuXG4gICAgY29uc3RydWN0b3IgKCkge1xuXG4gICAgICAgIHRoaXMuX3N0YXRlcyA9IHt9O1xuXG4gICAgfVxuXG4gICAgY2hhbmdlX2xpc3QgKCkge1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IHZhbF9pdGVyX2dycCA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IFtpLm5leHQoKSwgaV0pXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgd2hpbGUgKHZhbF9pdGVyX2dycC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgdiA9IHZhbF9pdGVyX2dycFswXVswXTtcbiAgICAgICAgICAgIGxldCBpID0gdmFsX2l0ZXJfZ3JwWzBdWzFdO1xuICAgICAgICAgICAgY2hhbmdlcy5wdXNoKHYpO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwWzBdID0gW2kubmV4dCgpLCBpXTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycCA9IHZhbF9pdGVyX2dycFxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGEpID0+IGFbMF0gIT09IG51bGwpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcztcblxuICAgIH1cblxuICAgIGFkZF9jaGFuZ2UgKHN0X25hbWUsIHN0X3ZhbCwgdHMpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0YXRlc1tzdF9uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgc3RhdGVzW3N0X25hbWVdID0gbmV3IGJpbnRyZWVzLlJCVHJlZSh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHsndGltZXN0YW1wJzogdHN9KTtcbiAgICAgICAgbGV0IG5leHQgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgbGV0IGN1ciA9IGl0ZXIucHJldigpO1xuXG4gICAgICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLmluc2VydCh7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9KTtcbiAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpXG4gICAgICAgICAgICAgICAgc3RhdGUucmVtb3ZlKG5leHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGN1ci50aW1lc3RhbXAgPT09IHRzKSB7XG4gICAgICAgICAgICBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByZXYgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RfdmFsID09PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUucmVtb3ZlKGN1cik7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ci52YWwgPSBzdF92YWw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5yZW1vdmUobmV4dCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcmV2LnZhbCA9PT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnJlbW92ZShjdXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCAhPT0gbnVsbCAmJiBuZXh0LnZhbCA9PT0gc3RfdmFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUucmVtb3ZlKG5leHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGN1ci52YWwgPSBzdF92YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgc3RhdGUuaW5zZXJ0KHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBsZXQgZmlyc3RfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBpLm5leHQoKSlcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChmaXJzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IGVhcmxpZXN0X3RpbWVzdGFtcCA9IGZpcnN0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGZpcnN0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IGVhcmxpZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBsYXN0ICgpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBsYXN0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5pdGVyYXRvcigpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4gaS5wcmV2KCkpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobGFzdF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG9sZGVzdF90aW1lc3RhbXAgPSBsYXN0X3ZhbF9jaGFuZ2VzW2xhc3RfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gbGFzdF92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBvbGRlc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIG5leHQgKGN1cnJlbnQpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBuZXh0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS51cHBlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKVxuICAgICAgICAgICAgICAgICAgICBpLm5leHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobmV4dF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG5leHRfdGltZXN0YW1wID0gbmV4dF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBuZXh0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IG5leHRfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIHByZXYgKGN1cnJlbnQpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIHN0YXRlICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCByZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIHJldHVybiByZWMgPT09IG51bGwgPyBudWxsIDogcmVjLnZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVjID0gdGhpcy5zdGF0ZSh0cywgc24pO1xuICAgICAgICAgICAgICAgIGlmIChyZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjY1tzbl0gPSByZWM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgIH1cblxuICAgIHN0YXRlX2RldGFpbCAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB7J2Zyb20nOiBudWxsLCAndG8nOiBudWxsfTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgPT09IG51bGwgJiYgbmV4dF9yZWMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3NuXTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsIHx8IG5leHRfcmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwgW10pO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV9jbXAgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYS50aW1lc3RhbXAgPCBiLnRpbWVzdGFtcCA/IC0xXG4gICAgICAgICAgICA6IGEudGltZXN0YW1wID4gYi50aW1lc3RhbXAgPyAxXG4gICAgICAgICAgICA6IGEubmFtZSA8IGIubmFtZSA/IC0xXG4gICAgICAgICAgICA6IGEubmFtZSA+IGIubmFtZSA/IDFcbiAgICAgICAgICAgIDogMDtcblxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHRlbXBvcmFsc3RhdGU7XG4iXX0=
//# sourceMappingURL=temporalstate_es5.js.map
