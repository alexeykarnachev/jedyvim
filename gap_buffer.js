export class GapBuffer {
    constructor(gap_size) {
        this.gap_size = gap_size;
        this.gap_left = 0;
        this.gap_right = this.gap_size - 1;
        this.buffer = new Array(gap_size);
    }

    get_element(i) {
        if (i < this.gap_left) {
            return this.buffer[i];
        } else {
            let gap_size = this.gap_right - this.gap_left + 1;
            return this.buffer[i + gap_size];
        }
    }

    get_element_right_to_cursor(n_steps=1) {
        return this.buffer[this.gap_right + n_steps];
    }

    get_element_left_to_cursor(n_steps=1) {
        return this.buffer[this.gap_left - n_steps];
    }

    move_left(n_steps = 1) {
        let pos = Math.max(0, this.gap_left - n_steps);
        while (pos < this.gap_left) {
            this.buffer[this.gap_right] = this.buffer[this.gap_left - 1];
            this.buffer[this.gap_left - 1] = null;
            this.gap_left -= 1;
            this.gap_right -= 1;
        }
    }

    move_right(n_steps = 1) {
        let pos = this.gap_left + n_steps;
        while (pos > this.gap_left && this.buffer[this.gap_right + 1] != null) {
            this.buffer[this.gap_left] = this.buffer[this.gap_right + 1];
            this.buffer[this.gap_right + 1] = null;
            this.gap_left += 1;
            this.gap_right += 1;
        }
    }

    move_to_pos(pos) {
        if (pos < this.gap_left) {
            this.move_left(this.gap_left - pos);
        } else if (pos > this.gap_left) {
            this.move_right(pos - this.gap_left);
        }
    }

    move_to_end() {
        let n_steps = this.buffer.length - this.gap_right - 1;
        this.move_right(n_steps);
    }

    move_to_beginning() {
        this.move_to_pos(0);
    }

    insert_at_pos(elements, pos) {
        let len = elements.length;
        let i = 0;

        if (pos != this.gap_left) {
            this.move_to_pos(pos);
        }

        while (i < len) {
            this.buffer[this.gap_left] = elements[i];
            this.gap_left += 1;
            i += 1;

            if (this.gap_left > this.gap_right) {
                this.grow();
            }
        }
    }

    insert(elements) {
        this.insert_at_pos(elements, this.gap_left);
    }

    delete_left(n_steps=1) {
        this.gap_left = Math.max(0, this.gap_left - n_steps);
    }

    delete_right(n_steps=1) {
        this.gap_right = Math.min(this.buffer.length - 1, this.gap_right + n_steps);
    }

    grow() {
        this.buffer.splice(this.gap_left, 0, ...new Array(this.gap_size));
        this.gap_right = this.gap_left + this.gap_size - 1;
    }
}
