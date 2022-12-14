export const OP = { INSERT_LEFT: "insert_left", INSERT_RIGHT: "insert_right", DELETE_LEFT: "delete_left", DELETE_RIGHT: "delete_right" }

export class UndoTree {
    constructor() {
        this.current = [];
        this.ptr = 0;
        this.history = [];
    }

    _add_operation(text, abs, restore_abs, op) {
        text = [...text];

        if (![OP.INSERT_LEFT, OP.INSERT_RIGHT, OP.DELETE_LEFT, OP.DELETE_RIGHT].includes(op)) {
            throw (`[ERROR] Can't '${op}' text, this op is not supported by the undo tree. It's a bug in the undo tree or on the caller side`);
        }

        if (this.current.length === 0) {
            this.current.push({ abs: abs, restore_abs: restore_abs, text: text, op: op });
        } else if (this.current[this.current.length - 1].op === op) {
            this.current[this.current.length - 1].text.push(...text);
        } else {
            this.current.push({ abs: abs, restore_abs: restore_abs, text: text, op: op });
        }
    }

    insert_text_left(text, abs, restore_abs=null) {
        this._add_operation(text, abs, restore_abs, OP.INSERT_LEFT);
    }

    insert_text_right(text, abs, restore_abs=null) {
        this._add_operation(text, abs, restore_abs, OP.INSERT_RIGHT);
    }

    delete_text_left(text, abs, restore_abs=null) {
        this._add_operation(text, abs, restore_abs, OP.DELETE_LEFT);
    }

    delete_text_right(text, abs, restore_abs=null) {
        this._add_operation(text, abs, restore_abs, OP.DELETE_RIGHT);
    }

    finalize() {
        if (this.current.length === 0) {
            return;
        }
        
        while (this.ptr < this.history.length) {
            this.history.pop();
        }

        this.history.push(this.current);
        this.current = [];
        this.ptr += 1;
        if (this.ptr !== this.history.length) {
            throw(`[ERROR] Undo history pointer must point at the end of the history array after finalize operation. It's a bug in the undo tree`)
        }
    }

    undo() {
        this.finalize();
        if (this.ptr == null) {
            return null;
        }

        this.ptr -= 1;
        if (this.ptr < 0) {
            this.ptr = null;
            return null;
        }

        return this.history[this.ptr];
    }

    redo() {
        if (this.current.length > 0 || this.ptr === this.history.length) {
            return null;
        }

        return this.history[this.ptr++];
    }
}
