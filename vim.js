import { Doc } from "./doc.js";
import { is_printable } from "./keyboard_events.js";

export const MODES = {
    normal: "normal",
    insert: "insert",
    visual: "visual",
    visual_line: "visual_line",
};

export class Vim {
    /**
     * @param {Doc} doc
     */
    constructor(doc) {
        this.doc = doc;
        this.mode = MODES.normal;
        this.i_col_max = 0;
        this.command = [];
        this.last_info_msg = null;
    }

    get is_insert_mode() {
        return this.mode == MODES.insert;
    }

    /**
     * @param {KeyboardEvent} event
     */
    onkeydown(event) {
        event.preventDefault();

        let key = event.key;
        let ctrl = event.ctrlKey;
        if (!["Control", "Alt"].includes(key)) {
            return this.process_input(key, ctrl);
        }

        return false;
    }

    process_input(key, ctrl) {
        let mode = this.mode;
        let last_info_msg = null;

        if (key === "ArrowLeft") {
            this.doc.move_cursor_left();
        } else if (key === "ArrowRight") {
            this.doc.move_cursor_right();
        } else if (key === "ArrowUp") {
            this.doc.move_cursor_up(this.i_col_max);
        } else if (key === "ArrowDown") {
            this.doc.move_cursor_down(this.i_col_max);
        } else if (this.mode !== MODES.insert && this.command.length === 1 && is_printable(key)) {
            let command = this.command[0];
            if (command === "f") {
                this.doc.move_cursor_to_char_right(key, true, false);
            } else if (command === "F") {
                this.doc.move_cursor_to_char_left(key, true, false);
            } else if (command === "t") {
                this.doc.move_cursor_to_char_right(key, true, true);
            } else if (command === "T") {
                this.doc.move_cursor_to_char_left(key, true, true);
            }

            if (command === "d" && key === "i") {
                this.command.push(key);
            } else if (command === "d" && key === "d") {
                this.doc.span_select_on_line
                this.doc.delete_line();
                this.command = [];
            } else {
                this.command = [];
            }
        } else if (this.mode === MODES.normal && this.command.length === 2) {
            let command = this.command.join("");
            if (command === "di" && key.toLowerCase() === "w") {
                this.doc.delete_word()
            }
            this.command = [];
        } else if (this.mode !== MODES.insert) {
            if (["f", "t"].includes(key.toLowerCase())) {
                this.command.push(key);
            } else if (key === "i" && this.mode === MODES.normal) {
                this.mode = MODES.insert;
            } else if (key === "I" && this.mode === MODES.normal) {
                this.doc.move_cursor_to_first_nonblank_char_in_line();
                this.doc.stop_select();
                this.mode = MODES.insert;
            } else if (key === "a" && this.mode === MODES.normal) {
                this.doc.move_cursor_right();
                this.mode = MODES.insert;
            } else if (key === "A" && this.mode === MODES.normal) {
                this.doc.move_cursor_to_end_of_line();
                this.mode = MODES.insert;
            } else if (key === "A" && this.mode !== MODES.normal) {
                this.doc.move_cursor_right();
                this.doc.stop_select();
                this.mode = MODES.insert;
            } else if (key === "w") {
                this.doc.move_cursor_word_right(false, true);
            } else if (key === "W") {
                this.doc.move_cursor_word_right(false, false);
            } else if (key === "b") {
                this.doc.move_cursor_word_left(false, true);
            } else if (key === "B") {
                this.doc.move_cursor_word_left(false, false);
            } else if (key === "e") {
                this.doc.move_cursor_word_end_right(false, true);
            } else if (key === "E") {
                this.doc.move_cursor_word_end_right(false, false);
            } else if (key === "o" && this.mode === MODES.normal) {
                this.doc.insert_new_line_below_cursor();
                this.mode = MODES.insert;
            } else if (key === "O" && this.mode === MODES.normal) {
                this.doc.insert_new_line_above_cursor();
                this.mode = MODES.insert;
            } else if (["o", "O"].includes(key) && this.mode !== MODES.normal) {
                this.doc.move_cursor_to_opposite_select_side();
            } else if (key === "$") {
                this.doc.move_cursor_to_end_of_line();
            } else if (key === "^") {
                this.doc.move_cursor_to_first_nonblank_char_in_line();
            } else if (key === "_") {
                this.doc.move_cursor_to_first_nonblank_char_in_line();
            } else if (key === "0") {
                this.doc.move_cursor_to_beginning_of_line();
            } else if (key === "h") {
                this.doc.move_cursor_left();
            } else if (key === "l") {
                this.doc.move_cursor_right();
            } else if (key === "k") {
                this.doc.move_cursor_up(this.i_col_max);
            } else if (key === "j") {
                this.doc.move_cursor_down(this.i_col_max);
            } else if (key === "}") {
                this.doc.move_cursor_to_paragraph(false);
            } else if (key === "{") {
                this.doc.move_cursor_to_paragraph(true);
            }

            if (this.mode === MODES.visual) {
                if (key === "Escape" && this.command.length > 0) {
                    this.command = [];
                } else if (["v", "Escape"].includes(key)) {
                    this.doc.stop_select();
                    this.mode = MODES.normal;
                } else if (["d", "x"].includes(key.toLowerCase())) {
                    this.doc.delete_select();
                    this.mode = MODES.normal;
                } else if (key === "V") {
                    this.doc.start_select_line();
                    this.mode = MODES.visual_line;
                }
            } else if (this.mode === MODES.visual_line) {
                if (key === "Escape" && this.command.length > 0) {
                    this.command = [];
                } else if (key === "v") {
                    this.doc.start_select();
                    this.mode = MODES.visual;
                } else if (["V", "Escape"].includes(key)) {
                    this.doc.stop_select();
                    this.mode = MODES.normal;
                } else if (["d", "x"].includes(key.toLowerCase())) {
                    this.doc.delete_select();
                    this.mode = MODES.normal;
                }
            } else if (this.mode === MODES.normal) {
                if (key === "Escape") {
                    this.command = [];
                } else if (key === "d") {
                    this.command.push(key);
                } else if (key === "D") {
                    this.doc.delete_to_end_of_line();
                } else if (key === "v") {
                    this.doc.start_select();
                    this.mode = MODES.visual;
                } else if (key === "V") {
                    this.doc.start_select_line();
                    this.mode = MODES.visual_line;
                } else if (key === "u") {
                    if (!this.doc.undo()) {
                        last_info_msg = "Already at oldest change";
                    }
                } else if (key === "r" && ctrl) {
                    if (!this.doc.redo()) {
                        last_info_msg = "Already at newest change";
                    }
                }
            }
        } else if (this.mode === MODES.insert) {
            if (is_printable(key)) {
                this.doc.insert_text(key);
            } else if (key === "Tab") {
                this.doc.insert_text("    ");
            } else if (key === "Escape") {
                this.mode = MODES.normal;
                this.doc.move_cursor_left();
            } else if (key === "Enter") {
                this.doc.insert_text("\n");
            } else if (key === "Backspace") {
                this.doc.delete_char_left()
            }
        }

        if (this.mode === MODES.normal && !this.doc.is_at_bol && this.doc.is_at_eol) {
            this.doc.move_cursor_left();
        }

        if (
            (mode !== this.mode)
            || (this.mode !== MODES.insert && !["ArrowUp", "ArrowDown", "k", "j"].includes(key))
            || (this.mode === MODES.insert && !["ArrowUp", "ArrowDown"].includes(key))
        ) {
            this.i_col_max = this.doc.cursor.i_col;
        } else {
            this.i_col_max = Math.max(this.i_col_max, this.doc.cursor.i_col);
        }

        this.last_info_msg = last_info_msg;
    }
}

