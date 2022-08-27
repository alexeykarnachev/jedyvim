export class Grid {
    constructor(width, height, cell_width, cell_height) {
        this.width = width;
        this.height = height;
        this.cell_width = cell_width;
        this.cell_height = cell_height;
        this.n_rows = Math.floor(height / this.cell_height);
        this.n_cols = Math.floor(width / this.cell_width);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.n_rows = Math.floor(height / this.cell_height);
        this.n_cols = Math.floor(width / this.cell_width);
    }

    get_cell_pos(i_row, i_col) {
        let x = i_col * this.cell_width;
        let y = i_row * this.cell_height;
        let w = this.cell_width;
        let h = this.cell_height;
        let cell = { x: x, y: y, w: w, h: h };

        return cell;
    }
}
