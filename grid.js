export class Grid {
    constructor(width, height, cell_width, cell_height, width_offset, height_offset) {
        this.width = width;
        this.height = height;
        this.cell_width = cell_width;
        this.cell_height = cell_height;
        this.width_offset = width_offset;
        this.height_offset = height_offset;
        this.n_rows = Math.floor(this.height / this.cell_height);
        this.n_cols = Math.floor(this.width / this.cell_width);
    }

    resize(width, height, width_offset, height_offset) {
        this.width = width;
        this.height = height;
        this.width_offset = width_offset;
        this.height_offset = height_offset;
        this.n_rows = Math.floor(this.height / this.cell_height);
        this.n_cols = Math.floor(this.width / this.cell_width);
    }

    get_cell_pos(i_row, i_col) {
        let x = i_col * this.cell_width + this.width_offset;
        let y = i_row * this.cell_height + this.height_offset;
        let w = this.cell_width;
        let h = this.cell_height;
        let cell = { x: x, y: y, w: w, h: h };

        return cell;
    }
}
