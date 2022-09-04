import { GapBuffer } from "./gap_buffer.js";

export class Doc {
    constructor() {
        this.buffer = new GapBuffer(32);
        this.cursor = { i_row: 0, i_col: 0, abs: 0 };
        this.select = null;
        this.is_select_started = false;
        this.is_select_line_started = false;
        this.remembered_select = null;
    }

    stop_select() {
        this.select = null;
        this.is_select_started = false;
        this.is_select_line_started = false;
        this.remembered_select = null
    }

    start_select() {
        if (this.remembered_select != null) {
            this.restore_select();
        } else {
            this.select = { top: { ...this.cursor }, bot: { ...this.cursor } };
        }
        this.is_select_started = true;
        this.is_select_line_started = false;
    }

    start_select_line() {
        this.remember_select();
        this.select = structuredClone(this.remembered_select);
        this.span_select_on_line(!this.is_select_started);
        this.is_select_started = true;
        this.is_select_line_started = true;
    }

    span_select_on_line(at_cursor_line) {
        this.move_select_to_beginning_of_line("top", at_cursor_line);
        this.move_select_to_end_of_line("bot", at_cursor_line);
    }

    remember_select() {
        if (this.select != null) {
            this.remembered_select = structuredClone(this.select);
        } else {
            this.remembered_select = { top: { ...this.cursor }, bot: { ...this.cursor } };
        }
    }

    restore_select() {
        if (this.remembered_select == null) {
            throw ("[ERROR] Can't restore select, because it was not remembered. It could be a bug on the caller side or on the doc engine side");
        }
        this.select = this.remembered_select;
        this.remembered_select = null;
    }

    get is_at_eol() {
        let char = this.buffer.get_element_right_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_eod() {
        let char = this.buffer.get_element_right_to_cursor();
        return char == null;
    }

    get is_at_bol() {
        let char = this.buffer.get_element_left_to_cursor();
        return (char == null || char === "\n");
    }

    get is_at_bod() {
        let char = this.buffer.get_element_left_to_cursor();
        return char == null;
    }

    get current_line_length() {
        let length = 0;
        let i = this.buffer.gap_right + 1;
        while (
            i < this.buffer.buffer.length
            && ![null, "\n"].includes(this.buffer.buffer[i])
        ) {
            i += 1;
            length += 1;
        }

        i = this.buffer.gap_left - 1;
        while (
            i >= 0
            && ![null, "\n"].includes(this.buffer.buffer[i])
        ) {
            i -= 1;
            length += 1;
        }

        return length;
    }

    get is_at_nonblank_beginning() {
        let left = this.buffer.get_element_left_to_cursor();
        let right = this.buffer.get_element_right_to_cursor();
        return (
            (left == null && is_nonblank(right))
            || (!is_nonblank(left) && is_nonblank(right))
            || (is_newline(left) && is_newline(right))
        );
    }

    get is_at_keyword_beginning() {
        let left = this.buffer.get_element_left_to_cursor();
        let right = this.buffer.get_element_right_to_cursor();
        return (
            this.is_at_nonblank_beginning
            || (is_alnum(left) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(left) && is_nonblank(left) && is_alnum(right))
        );
    }

    get is_at_nonblank_ending() {
        let right = this.buffer.get_element_right_to_cursor();
        let after_right = this.buffer.get_element_right_to_cursor(2);
        return (
            (after_right == null && is_nonblank(right))
            || (!is_nonblank(after_right) && is_nonblank(right))
        );
    }

    get is_at_keyword_ending() {
        let right = this.buffer.get_element_right_to_cursor();
        let after_right = this.buffer.get_element_right_to_cursor(2);
        return (
            this.is_at_nonblank_ending
            || (is_alnum(after_right) && !is_alnum(right) && is_nonblank(right))
            || (!is_alnum(after_right) && is_nonblank(after_right) && is_alnum(right))
        );
    }

    _get_cursor_select() {
        if (this.is_select_started) {
            if (this.is_select_line_started) {
                if (this.remembered_select == null) {
                    throw ("[ERROR] can't move remembered select since is't null. It's the doc engine bug");
                }
                return this.remembered_select;
            } else {
                return this.select;
            }
        }
        return null;
    }

    _get_select_name(select, move_dir) {
        let select_name = null;
        if (select != null) {
            if (select.top.abs === select.bot.abs) {
                if (move_dir === "left") {
                    select_name = "top";
                } else if (move_dir === "right") {
                    select_name = "bot";
                } else {
                    throw (`[ERROR] Unknown movement direction: ${move_dir}. It's the doc engine bug`)
                }
            } else if (this.cursor.abs === select.bot.abs) {
                select_name = "bot";
            } else if (this.cursor.abs === select.top.abs) {
                select_name = "top";
            } else {
                throw ("[ERROR] Can't move select when neither top bound nor bot bound doesn't stick to the cursor position. It's the doc engine bug")
            }
        }
        return select_name;
    }

    move_cursor_left(n_steps = 1, stop_at_bol = true, affect_line_select = true) {
        let i_row = this.cursor.i_row;
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_bol && (stop_at_bol || this.is_at_bod)) {
                break;
            }

            let select = this._get_cursor_select();
            let select_name = this._get_select_name(select, "left");

            this.buffer.move_left();
            this.cursor.abs -= 1;
            if (this.is_at_eol) {
                this.cursor.i_col = this.current_line_length;
                this.cursor.i_row -= 1;
            } else {
                this.cursor.i_col -= 1;
            }

            if (select_name !== null) {
                select[select_name] = { ...this.cursor };
            }
        }

        if (affect_line_select && this.is_select_line_started && this.cursor.i_row < i_row) {
            if (this.cursor.i_row > this.select.top.i_row && this.cursor.i_row < this.select.bot.i_row) {
                this.move_select_to_end_of_line("bot");
            } else if (this.cursor.i_row < this.select.top.i_row) {
                this.move_select_to_beginning_of_line("top");
            } else {
                this.move_select_to_beginning_of_line("top");
                this.move_select_to_end_of_line("bot");
            }
        }

        if (this.cursor.abs !== this.buffer.gap_left) {
            throw (`Cursor pos is not equal to buffer pos (${this.cursor.abs} != ${this.buffer.gap_left}) after move_cursor_left select. It's the doc engine bug`)
        }
    }

    move_cursor_right(n_steps = 1, stop_at_eol = true, affect_line_select = true) {
        let i_row = this.cursor.i_row;
        for (let i = 0; i < n_steps; ++i) {
            if (this.is_at_eol && (stop_at_eol || this.is_at_eod)) {
                break;
            }

            let select = this._get_cursor_select();
            let select_name = this._get_select_name(select, "right");

            this.cursor.abs += 1;
            if (this.is_at_eol) {
                this.cursor.i_col = 0;
                this.cursor.i_row += 1;
            } else {
                this.cursor.i_col += 1;
            }
            this.buffer.move_right();

            if (select_name !== null) {
                select[select_name] = { ...this.cursor };
            }
        }

        if (affect_line_select && this.is_select_line_started && this.cursor.i_row > i_row) {
            if (this.cursor.i_row > this.select.top.i_row && this.cursor.i_row < this.select.bot.i_row) {
                this.move_select_to_beginning_of_line("top");
            } else if (this.cursor.i_row > this.select.bot.i_row) {
                this.move_select_to_end_of_line("bot");
            } else {
                this.move_select_to_beginning_of_line("top");
                this.move_select_to_end_of_line("bot");
            }
        }

        if (this.cursor.abs !== this.buffer.gap_left) {
            throw (`Cursor pos is not equal to buffer pos (${this.cursor.abs} != ${this.buffer.gap_left}) after move_cursor_left select. It's the doc engine bug`)
        }
    }

    move_cursor_up(i_col_max) {
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_left(1, false);
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_right(i_col_max);
    }

    move_cursor_down(i_col_max) {
        this.move_cursor_to_end_of_line();
        this.move_cursor_right(1, false);
        this.move_cursor_to_beginning_of_line();
        this.move_cursor_right(i_col_max);
    }

    move_cursor_word_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_cursor_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        );
    }

    move_cursor_word_left(stop_at_bol, stop_at_keyword_char) {
        do {
            if (stop_at_bol && this.is_at_bol) {
                break;
            }
            this.move_cursor_left(1, false);
        } while (
            !this.is_at_bod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_beginning)
                || (stop_at_keyword_char && !this.is_at_keyword_beginning)
            )
        )
    }

    move_cursor_word_end_right(stop_at_eol, stop_at_keyword_char) {
        do {
            if (stop_at_eol && this.is_at_eol) {
                break;
            }
            this.move_cursor_right(1, false);
        } while (
            !this.is_at_eod
            && (
                (!stop_at_keyword_char && !this.is_at_nonblank_ending)
                || (stop_at_keyword_char && !this.is_at_keyword_ending)
            )
        );
    }

    move_cursor_to_first_nonblank_char_in_line() {
        this.move_cursor_to_beginning_of_line();
        if (!is_nonblank(this.buffer.get_element_right_to_cursor())) {
            this.move_cursor_word_right(true);
        }
    }

    move_cursor_to_char_right(target_char, stop_at_eol, stop_before_char) {
        let i = this.buffer.gap_right + 2;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this.buffer.buffer[i];
            if (char == null || (stop_at_eol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_cursor_right(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i += 1;
            }
        }
    }

    move_cursor_to_char_left(target_char, stop_at_bol, stop_before_char) {
        let i = this.buffer.gap_left - 1;
        let n_steps = stop_before_char ? 0 : 1;
        while (true) {
            let char = this.buffer.buffer[i];
            if (char == null || (stop_at_bol && is_newline(char))) {
                return;
            } else if (char === target_char) {
                this.move_cursor_left(n_steps, false);
                return;
            } else {
                n_steps += 1;
                i -= 1;
            }
        }
    }

    move_cursor_to_opposite_select_side() {
        if (!this.is_select_started) {
            throw ("[ERROR] Can't move cursor to the opposite select side while the selection mode is not started. Maybe it's a bug on the caller side")
        }
        let select = this._get_cursor_select();

        if (select.top.abs === this.cursor.abs) {
            let tmp_select = { ...select.top };
            this.move_cursor_right(select.bot.abs - this.cursor.abs, false, false);
            select.top = tmp_select;
        } else if (select.bot.abs === this.cursor.abs) {
            let tmp_select = { ...select.bot };
            this.move_cursor_left(this.cursor.abs - select.top.abs, false, false);
            select.bot = tmp_select;
        } else {
            throw ("[ERROR] Can't move cursor to the opposite select side since the cursor is not sticked to neither select top nor select bot. It's the doc engine bug")
        }
    }

    get_n_steps_to_end_of_line(from = null) {
        let n_steps = 0;
        if (from == null) {
            from = this.buffer.gap_left;
        }
        for (let i = from; i < this.buffer.n_elements; ++i) {
            if (is_newline(this.buffer.get_element(i))) {
                break;
            }
            n_steps += 1;
        }
        return n_steps;
    }

    get_n_steps_to_beginning_of_line(from = null) {
        let n_steps = 0;
        if (from == null) {
            from = this.buffer.gap_left - 1;
        }
        for (let i = from; i >= 0; --i) {
            if (this.buffer.get_element(i) === "\n") {
                break;
            }
            n_steps += 1
        }
        return n_steps;
    }

    move_cursor_to_end_of_line() {
        let n_steps = this.get_n_steps_to_end_of_line();
        this.move_cursor_right(n_steps);
    }

    move_cursor_to_beginning_of_line() {
        let n_steps = this.get_n_steps_to_beginning_of_line();
        this.move_cursor_left(n_steps);
    }

    move_cursor_to_beginning_of_select() {
        if (this.is_select_started) {
            var n_steps = this.cursor.abs - this.select.top.abs;
        } else {
            throw ("Can't move cursor to beginning of select since the select is not started. It's a bug on the caller side or in the doc engine")
        }

        this.move_cursor_left(n_steps, false, false);
    }

    move_select_to_end_of_line(which, at_cursor_line = true) {
        if (at_cursor_line) {
            var n_steps = this.get_n_steps_to_end_of_line();
            this.select[which].i_row = this.cursor.i_row;
            this.select[which].i_col = this.cursor.i_col + n_steps;
            this.select[which].abs = this.cursor.abs + n_steps;

        } else {
            var n_steps = this.get_n_steps_to_end_of_line(this.select[which].abs);
            this.select[which].i_col = this.select[which].i_col + n_steps;
            this.select[which].abs = this.select[which].abs + n_steps;
        }
    }

    move_select_to_beginning_of_line(which, at_cursor_line = true) {
        if (at_cursor_line) {
            var n_steps = this.get_n_steps_to_beginning_of_line();
            this.select[which].i_row = this.cursor.i_row;
            this.select[which].abs = this.cursor.abs - n_steps;
        } else {
            var n_steps = this.get_n_steps_to_beginning_of_line(this.select[which].abs - 1);
            this.select[which].abs = this.select[which].abs - n_steps;
        }
        this.select[which].i_col = 0;
    }

    select_word() {
        let left_n_steps = 0;
        let start_char = this.buffer.get_element_right_to_cursor();

        while (true) {
            let char = this.buffer.get_element_left_to_cursor(left_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            left_n_steps += 1
        }

        let right_n_steps = 0;
        while (true) {
            let char = this.buffer.get_element_right_to_cursor(right_n_steps + 1);
            if (!is_same_type(start_char, char)) {
                break;
            }
            right_n_steps += 1
        }
        if (left_n_steps + right_n_steps < 1) {
            return;
        }
        this.move_cursor_left(left_n_steps, false);
        this.start_select();
        this.move_cursor_right(right_n_steps + left_n_steps - 1, false);
    }

    delete_select() {
        if (!this.is_select_started) {
            return;
        }
        if (this.cursor.abs < this.select.top.abs || this.cursor > this.select.bot.abs) {
            throw ("[ERROR] Can't remove select since cursor position is not in the select boundary. It's a bug in the doc engine")
        }
        let left_n_steps = this.cursor.abs - this.select.top.abs;
        let right_n_steps = this.select.bot.abs - this.cursor.abs + 1;
        this.move_cursor_left(left_n_steps, false);
        this.buffer.delete_right(left_n_steps + right_n_steps);
        this.stop_select();
    }

    delete_char_left() {
        if (this.is_at_bod) {
            return;
        }

        this.buffer.delete_left();
        this.cursor.abs -= 1;
        if (this.is_at_eol) {
            this.cursor.i_col = this.current_line_length;
            this.cursor.i_row -= 1;
        } else {
            this.cursor.i_col -= 1;
        }
        this.stop_select();
    }

    delete_word() {
        this.stop_select();
        this.select_word();
        this.delete_select();
    }

    insert_text(text) {
        if (this.is_select_started) {
            this.delete_select();
        }

        for (let i = 0; i < text.length; ++i) {
            this.cursor.abs += 1;
            if (text[i] === "\n") {
                this.cursor.i_row += 1;
                this.cursor.i_col = 0;
            } else {
                this.cursor.i_col += 1;
            }
        }
        this.buffer.insert(text)
        if (this.cursor.abs !== this.buffer.gap_left) {
            throw (`Cursor pos is not equal to buffer pos (${this.cursor.abs} != ${this.buffer.gap_left}) after text insertion: "${text}". It's the doc engine bug`)
        }
    }

    insert_new_line_above_cursor() {
        this.move_cursor_to_beginning_of_line();
        this.insert_text("\n");
        this.move_cursor_left(1, false);
    }

    insert_new_line_below_cursor() {
        this.move_cursor_to_end_of_line();
        this.insert_text("\n");
    }
}

function is_newline(char) {
    return (char != null && char === "\n");
}

function is_nonblank(char) {
    return (char != null && !char.match(/\s/));
}

function is_same_type(char1, char2) {
    if (is_newline(char1) || is_newline(char2) || char1 == null || char2 == null) {
        return false;
    } else if (
        (!is_nonblank(char1) && !is_nonblank(char2))
        || (is_alnum(char1) && is_alnum(char2))
        || (!is_alnum(char1) && !is_alnum(char2) && is_nonblank(char1) && is_nonblank(char2))
    ) {
        return true;
    } else {
        return false;
    }
}

function is_alnum(char, or_underscore = true) {
    if (or_underscore) {
        var regexp = /\w|_/;
    } else {
        var regexp = /\w/;
    }
    return (char != null && char.match(regexp));
}
