import { Doc } from "./doc.js";
import { is_printable } from "./keyboard_events.js";

export const MODES = {
    normal: "normal",
    insert: "insert"
}

export class Vim {
    /**
     * @param {Doc} doc
     */
    constructor(doc) {
        this.doc = doc;
        this.mode = MODES.normal;
        this.i_col_max = 0;
    }

    is_insert_mode() {
        return this.mode == MODES.insert;
    }

    /**
     * @param {KeyboardEvent} event
     */
    onkeydown(event) {
        event.preventDefault();

        let code = event.code;
        let key = event.key;
        let shift_key = event.shiftKey;
        let mode = this.mode;

        if (code === "ArrowLeft") {
            this.doc.move_cursor_left();
        } else if (code === "ArrowRight") {
            this.doc.move_cursor_right();
        } else if (code === "ArrowUp") {
            this.doc.move_cursor_up(this.i_col_max);
        } else if (code === "ArrowDown") {
            this.doc.move_cursor_down(this.i_col_max);
        } else if (this.mode === MODES.normal) {
            if (code === "KeyI") {
                if (shift_key) {
                    this.doc.move_cursor_to_first_nonblank_char_in_line();
                }
                this.mode = MODES.insert;
            } else if (code === "KeyA") {
                if (shift_key) {
                    this.doc.move_cursor_to_end_of_line();
                } else {
                    this.doc.move_cursor_right();
                }
                this.mode = MODES.insert;
            } else if (code === "KeyW") {
                this.doc.move_cursor_word_right(false, !shift_key);
            } else if (code === "KeyB") {
                this.doc.move_cursor_word_left(false, !shift_key);
            } else if (code === "KeyE") {
                this.doc.move_cursor_word_end_right(false, !shift_key);
            } else if (code === "KeyO") {
                if (shift_key) {
                    this.doc.insert_new_line_above_cursor();
                } else {
                    this.doc.insert_new_line_below_cursor();
                }
                this.mode = MODES.insert;
            } else if (code === "Digit4" && shift_key) { // $
                this.doc.move_cursor_to_end_of_line();
            } else if (code === "Digit6" && shift_key) { // ^
                this.doc.move_cursor_to_first_nonblank_char_in_line();
            } else if (code === "Minus" && shift_key) { // _
                this.doc.move_cursor_to_first_nonblank_char_in_line();
            } else if (code === "Digit0") {
                this.doc.move_cursor_to_beginning_of_line();
            } else if (code === "KeyH") {
                this.doc.move_cursor_left();
            } else if (code === "KeyL") {
                this.doc.move_cursor_right();
            } else if (code === "KeyK") {
                this.doc.move_cursor_up(this.i_col_max);
            } else if (code === "KeyJ") {
                this.doc.move_cursor_down(this.i_col_max);
            }
        } else if (this.mode === MODES.insert) {
            if (is_printable(key)) {
                this.doc.insert_text(key);
            } else if (code === "Tab") {
                this.doc.insert_text("    ");
            } else if (code === "Escape") {
                this.mode = MODES.normal;
                this.doc.move_cursor_left();
            } else if (code === "Enter") {
                this.doc.insert_text("\n");
            } else if (code === "Backspace") {
                this.doc.delete_text();
            }
        }

        if (this.mode !== MODES.insert && !this.doc.is_at_bol && this.doc.is_at_eol) {
            this.doc.move_cursor_left();
        }

        if (
            (mode != this.mode)
            || (this.mode !== MODES.insert && !["ArrowUp", "ArrowDown", "KeyK", "KeyJ"].includes(code))
            || (this.mode === MODES.insert && !["ArrowUp", "ArrowDown"].includes(code))
        ) {
            this.i_col_max = this.doc.cursor_pos.i_col;
        } else {
            this.i_col_max = Math.max(this.i_col_max, this.doc.cursor_pos.i_col);
        }
    }
}

