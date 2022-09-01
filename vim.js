import { Doc } from "./doc.js";
import { is_printable } from "./keyboard_events.js";

export const MODES = {
    normal: "normal",
    insert: "insert",
    visual: "visual",
}

export class Vim {
    /**
     * @param {Doc} doc
     */
    constructor(doc) {
        this.doc = doc;
        this.mode = MODES.normal;
        this.i_col_max = 0;
        this.command = [];
    }

    is_insert_mode() {
        return this.mode == MODES.insert;
    }

    /**
     * @param {KeyboardEvent} event
     */
    onkeydown(event) {
        event.preventDefault();

        let key = event.key;
        this.process_input(key)
    }

    process_input(key) {
        let mode = this.mode;

        if (key === "ArrowLeft") {
            this.doc.move_head_left();
        } else if (key === "ArrowRight") {
            this.doc.move_head_right();
        } else if (key === "ArrowUp") {
            this.doc.move_head_up(this.i_col_max);
        } else if (key === "ArrowDown") {
            this.doc.move_head_down(this.i_col_max);
        } else if (this.mode === MODES.normal && this.command.length === 1 && is_printable(key)) {
            let command = this.command[0];
            if (command === "f") {
                this.doc.move_head_to_char_right(key, true, false);
            } else if (command === "F") {
                this.doc.move_head_to_char_left(key, true, false);
            } else if (command === "t") {
                this.doc.move_head_to_char_right(key, true, true);
            } else if (command === "T") {
                this.doc.move_head_to_char_left(key, true, true);
            }

            if (command === "d" && key === "i") {
                this.command.push(key);
            } else {
                this.command = [];
            }
        } else if (this.mode === MODES.normal && this.command.length === 2) {
            let command = this.command.join("");
            if (command === "di" && key.toLowerCase() === "w") {
                this.doc.delete_word()
            }
            this.command = [];
        } else if (this.mode === MODES.normal) {
            if (
                ["f", "t"].includes(key.toLowerCase())
                || ["d"].includes(key)
            ) {
                this.command.push(key);
            } else if (key === "v") {
                this.mode = MODES.visual; 
                this.doc.fix_tail()
            } else if (key === "i") {
                this.mode = MODES.insert;
            } else if (key === "I") {
                this.doc.move_head_to_first_nonblank_char_in_line();
                this.mode = MODES.insert;
            } else if (key === "a") {
                this.doc.move_head_right();
                this.mode = MODES.insert;
            } else if (key === "A") {
                this.doc.move_head_to_end_of_line();
                this.mode = MODES.insert;
            } else if (key === "w") {
                this.doc.move_head_word_right(false, true);
            } else if (key === "W") {
                this.doc.move_head_word_right(false, false);
            } else if (key === "b") {
                this.doc.move_head_word_left(false, true);
            } else if (key === "B") {
                this.doc.move_head_word_left(false, false);
            } else if (key === "e") {
                this.doc.move_head_word_end_right(false, true);
            } else if (key === "E") {
                this.doc.move_head_word_end_right(false, false);
            } else if (key === "o") {
                this.doc.insert_new_line_below_head();
                this.mode = MODES.insert;
            } else if (key === "O") {
                this.doc.insert_new_line_above_head();
                this.mode = MODES.insert;
            } else if (key === "$") {
                this.doc.move_head_to_end_of_line();
            } else if (key === "^") {
                this.doc.move_head_to_first_nonblank_char_in_line();
            } else if (key === "_") {
                this.doc.move_head_to_first_nonblank_char_in_line();
            } else if (key === "0") {
                this.doc.move_head_to_beginning_of_line();
            } else if (key === "h") {
                this.doc.move_head_left();
            } else if (key === "l") {
                this.doc.move_head_right();
            } else if (key === "k") {
                this.doc.move_head_up(this.i_col_max);
            } else if (key === "j") {
                this.doc.move_head_down(this.i_col_max);
            }
        } else if (this.mode === MODES.insert) {
            if (is_printable(key)) {
                this.doc.insert_text(key);
            } else if (key === "Tab") {
                this.doc.insert_text("    ");
            } else if (key === "Escape") {
                this.mode = MODES.normal;
                this.doc.move_head_left();
            } else if (key === "Enter") {
                this.doc.insert_text("\n");
            } else if (key === "Backspace") {
                this.doc.delete_char_left()
            }
        }

        if (this.mode !== MODES.insert && !this.doc.is_at_bol && this.doc.is_at_eol) {
            this.doc.move_head_left();
        }

        if (
            (mode != this.mode)
            || (this.mode !== MODES.insert && !["ArrowUp", "ArrowDown", "k", "j"].includes(key))
            || (this.mode === MODES.insert && !["ArrowUp", "ArrowDown"].includes(key))
        ) {
            this.i_col_max = this.doc.head.i_col;
        } else {
            this.i_col_max = Math.max(this.i_col_max, this.doc.head.i_col);
        }
    }
}

