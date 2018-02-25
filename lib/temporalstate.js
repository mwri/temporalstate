import bintrees from 'bintrees';


class temporalstate {

    constructor () {

        this._states = {};

    }

    change_list () {

        let changes = [];
        let states = this._states;

        let val_iter_grp = Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].iterator())
            .map((i) => [i.next(), i])
            .sort((a, b) => temporalstate.change_cmp(a[0], b[0]));
        while (val_iter_grp.length > 0) {
            let v = val_iter_grp[0][0];
            let i = val_iter_grp[0][1];
            changes.push(v);
            val_iter_grp[0] = [i.next(), i];
            val_iter_grp = val_iter_grp
                .filter((a) => a[0] !== null)
                .sort((a, b) => temporalstate.change_cmp(a[0], b[0]));
        }

        return changes;

    }

    add_change (st_name, st_val, ts) {

        let states = this._states;
        
        if (states[st_name] === undefined)
            states[st_name] = new bintrees.RBTree(temporalstate.change_cmp);

        let state = states[st_name];
        let iter = state.upperBound({'timestamp': ts});
        let next = iter.data();
        let cur = iter.prev();

        if (cur === null) {
            state.insert({'timestamp': ts, 'name': st_name, 'val': st_val});
            if (next !== null && next.val === st_val)
                state.remove(next);
        } else if (cur.timestamp === ts) {
            if (cur.val !== st_val) {
                let prev = iter.prev();
                if (prev === null) {
                    if (st_val === null)
                        state.remove(cur);
                    else
                        cur.val = st_val;
                    if (next !== null && next.val === st_val)
                        state.remove(next);
                } else if (prev.val === st_val) {
                    state.remove(cur);
                    if (next !== null && next.val === st_val)
                        state.remove(next);
                } else {
                    cur.val = st_val;
                }
            }
        } else if (cur.val !== st_val) {
            state.insert({'timestamp': ts, 'name': st_name, 'val': st_val});
        }

    }

    var_list () {

        return Object.keys(this._states).sort();

    }

    first () {

        let states = this._states;

        let first_val_changes = Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].iterator())
            .map((i) => i.next())
            .sort(temporalstate.change_cmp);
        if (first_val_changes.length === 0)
            return null;
        let earliest_timestamp = first_val_changes[0].timestamp;
        return first_val_changes
            .filter((change) => change.timestamp === earliest_timestamp);

    }

    last () {

        let states = this._states;

        let last_val_changes = Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].iterator())
            .map((i) => i.prev())
            .sort(temporalstate.change_cmp);
        if (last_val_changes.length === 0)
            return null;
        let oldest_timestamp = last_val_changes[last_val_changes.length - 1].timestamp;
        return last_val_changes
            .filter((change) => change.timestamp === oldest_timestamp);

    }

    next (current) {

        let states = this._states;

        let next_val_changes = Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].upperBound(current))
            .map((i) => {
                while (i.data() !== null && i.data().timestamp === current.timestamp)
                    i.next();
                return i.data();
            })
            .filter((change) => change !== null)
            .sort(temporalstate.change_cmp);
        if (next_val_changes.length === 0)
            return null;
        let next_timestamp = next_val_changes[0].timestamp;
        return next_val_changes
            .filter((change) => change.timestamp === next_timestamp);

    }

    prev (current) {

        let states = this._states;

        let prev_val_changes = Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].lowerBound(current))
            .map((i) => {
                do {
                    i.prev();
                } while (i.data() !== null && i.data().timestamp === current.timestamp);
                return i.data();
            })
            .filter((change) => change !== null)
            .sort(temporalstate.change_cmp);
        if (prev_val_changes.length === 0)
            return null;
        let prev_timestamp = prev_val_changes[prev_val_changes.length - 1].timestamp;
        return prev_val_changes
            .filter((change) => change.timestamp === prev_timestamp);

    }

    state (ts, st_name) {

        let states = this._states;

        if (st_name !== undefined) {
            let state = states[st_name];
            if (state === undefined)
                return null;
            let iter = state.upperBound({timestamp: ts});
            let rec = iter.prev();
            return rec === null ? null : rec.val;
        }

        return Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .reduce((acc, sn) => {
                let rec = this.state(ts, sn);
                if (rec !== null)
                    acc[sn] = rec;
                return acc;
            }, {});

    }

    state_detail (ts, st_name) {

        let states = this._states;

        if (st_name !== undefined) {
            let state = states[st_name];
            if (state === undefined)
                return {'from': null, 'to': null};
            let iter = state.upperBound({timestamp: ts});
            let next_rec = iter.data();
            let cur_rec = iter.prev();
            if (cur_rec === null && next_rec === null)
                return null;
            return {
                'from': cur_rec,
                'to': next_rec
            };
        }

        return Object.keys(states)
            .sort()
            .reduce((acc, sn) => {
                let state = states[sn];
                let iter = state.upperBound({timestamp: ts});
                let next_rec = iter.data();
                let cur_rec = iter.prev();
                if (cur_rec !== null || next_rec !== null)
                    acc.push({
                        'from': cur_rec,
                        'to': next_rec
                    });
                return acc;
            }, []);

    }

    static change_cmp (a, b) {

        return a.timestamp < b.timestamp ? -1
            : a.timestamp > b.timestamp ? 1
            : a.name < b.name ? -1
            : a.name > b.name ? 1
            : 0;

    }

}


export default temporalstate;
