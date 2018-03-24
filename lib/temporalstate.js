import bintrees from 'bintrees';
import event_emitter from 'events';


class temporalstate extends event_emitter {

    constructor () {

        super();

        this._states = {};
        this._txn    = [];

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

    txn (id, descr, fun) {

        let txn_stack = this._txn;

        txn_stack.push({
            'id':    id,
            'descr': descr,
        });

        this.emit('txn_start', id, descr, txn_stack);
        fun();
        this.emit('txn_end', id, descr, txn_stack);

        txn_stack.pop();

    }

    add_change (change) {

        let states = this._states;

        let st_name = change.name;
        let st_val  = change.val;
        let ts      = change.timestamp;

        if (states[st_name] === undefined)
            this._priv_add_state(st_name);

        let state = states[st_name];
        let iter = state.upperBound(change);
        let next = iter.data();
        let cur = iter.prev();

        let txn_descr = [];
        let txn_funs = [];

        if (cur === null) {
            if (st_val !== null) {
                txn_descr.push({'add': {'timestamp': ts, 'name': st_name, 'val': st_val}});
                txn_funs.push(this._priv_change_add.bind(this, {'timestamp': ts, 'name': st_name, 'val': st_val}));
                if (next !== null && next.val === st_val) {
                    txn_descr.push({'rm': next});
                    txn_funs.push(this._priv_change_remove.bind(this, next));
                }
            }
        } else if (cur.timestamp === ts) {
            if (cur.val !== st_val) {
                let prev = iter.prev();
                if (prev === null) {
                    if (st_val === null) {
                        txn_descr.push({'remove': cur});
                        txn_funs.push(this._priv_change_remove.bind(this, cur));
                    } else {
                        txn_descr.push({'change': cur, 'new_val': st_val});
                        txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                    }
                    if (next !== null && next.val === st_val) {
                        txn_descr.push({'remove': next});
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                } else if (prev.val === st_val) {
                    txn_descr.push({'remove': cur});
                    txn_funs.push(this._priv_change_remove.bind(this, cur));
                    if (next !== null && next.val === st_val) {
                        txn_descr.push({'remove': next});
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                } else {
                    txn_descr.push({'change': cur, 'new_val': st_val});
                    txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                }
            }
        } else if (cur.val !== st_val) {
            txn_descr.push({'add': {'timestamp': ts, 'name': st_name, 'val': st_val}});
            txn_funs.push(this._priv_change_add.bind(this, {'timestamp': ts, 'name': st_name, 'val': st_val}));
            if (next !== null && next.val === st_val) {
                txn_descr.push({'rm': next});
                txn_funs.push(this._priv_change_remove.bind(this, next));
            }
        }

        this.txn(
            {'add': {'timestamp': ts, 'name': st_name, 'val': st_val}},
            txn_descr,
            function () { txn_funs.forEach((f) => f()); }
        );

    }

    remove_change (change) {

        let states = this._states;
        let state = states[change.name];

        if (state === undefined)
            return;

        let v = state.find(change);
        if (v !== null && v.val !== change.val)
                return;

        this.emit('txn_start', {'remove': change}, [{'remove': change}]);
        this._priv_change_remove(change);
        this.emit('txn_end', {'remove': change}, [{'remove': change}]);

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

    next (current, st_name) {

        let states = this._states;

        if (st_name !== undefined) {
            let state = states[st_name];
            if (state === undefined || state.size === 0)
                return null;
            return state.upperBound(current).data();
        }

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

    prev (current, st_name) {

        let states = this._states;

        if (st_name !== undefined) {
            let state = states[st_name];
            if (state === undefined || state.size === 0)
                return null;
            let iter = state.lowerBound(current);
            return iter.prev();
        }

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

    at (timestamp) {

        let states = this._states;

        return Object.keys(states)
            .filter((sn) => states[sn].size > 0)
            .map((sn) => states[sn].find({'timestamp': timestamp}))
            .filter((v) => v !== null)
            .sort(temporalstate.change_cmp);

    }

    after (timestamp) {

        return this.next({'timestamp': timestamp});

    }

    before (timestamp) {

        return this.prev({'timestamp': timestamp});

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

    between (from_ts, to_ts, greedy, st_name) {

        let states = this._states;

        if (greedy === undefined)
            greedy = false;

        let st_names = st_name === undefined
            ? this.var_list()
            : [st_name];

        let changes = [];
        for (let i = 0; i < st_names.length; i++) {
            let state = states[st_names[i]];
            let iter = state.upperBound({timestamp: from_ts});
            let cur_rec = iter.prev();
            if (cur_rec !== null && (greedy || cur_rec.timestamp === from_ts))
                changes.push(cur_rec);
            while ((cur_rec = iter.next()) && cur_rec.timestamp <= to_ts) {
                changes.push(cur_rec);
            }
        }

        return changes.sort(temporalstate.change_cmp);

    }

    remove_var (var_name) {

        let states = this._states;
        let state  = states[var_name];

        if (state && state.size === 0) {
            delete states[var_name];
            return true;
        }

        return false;

    }

    _priv_add_state (st_name) {

        this.emit('new_var', st_name);
        this._states[st_name] = new bintrees.RBTree(temporalstate.change_cmp);

    }

    _priv_change_add (change) {

        this.emit('add', {'timestamp': change.timestamp, 'name': change.name, 'val': change.val});
        this._states[change.name].insert(change);

    }

    _priv_change_remove (change) {

        this.emit('rm', {'timestamp': change.timestamp, 'name': change.name, 'val': change.val});
        this._states[change.name].remove(change);

    }

    _priv_change_change (change, new_val) {

        let old_val = change.val;

        this.emit('change', {'timestamp': change.timestamp, 'name': change.name, 'val': old_val}, new_val);
        change.val = new_val;

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
