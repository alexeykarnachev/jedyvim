import { Vim } from "./vim.js";
import { Doc } from "./doc.js";


export async function run_tests(throw_if_fail) {
    let test_cases = await fetch("./assets/test_cases.json").then(response => response.json());
    let named_results = {};
    for (let test_case of test_cases) {
        named_results[test_case.name] = run_test(test_case);
    }

    let n_failed = 0;
    for (let name in named_results) {
        let results = named_results[name];
        let is_failed = false;
        let test_report = [];
        let colors = [];

        for (let res of results) {
            if (res.code !== 0) {
                is_failed = true;
                test_report.push("    %cFailure: ");
                test_report.push(`%c${res.reason}, Actual: ${JSON.stringify(res.actual)}, Expected: ${JSON.stringify(res.expected)}\n`);
                colors.push("color: red");
                colors.push("color: black");
            } else {
                test_report.push("    %cSuccess: ");
                test_report.push(`%c${res.reason}\n`);
                colors.push("color: green");
                colors.push("color: black");
            }
        }

        if (is_failed) {
            console.log(`[ERROR] Test '${name}' %cfailed`, 'color: red');
            n_failed += 1;
        } else {
            console.log(`[DEBUG] Test '${name}' %cpassed`, 'color: green');
        }

        test_report.push("\n");
        test_report = test_report.join("");
        console.log(test_report, ...colors);
    }

    let report = `[DEBUG] Tests passed: ${test_cases.length - n_failed}/${test_cases.length}`;
    if (n_failed > 0 && throw_if_fail) {
        throw (report);
    } else {
        console.log(report);
    }
}

function run_test(test_case) {
    let input = test_case.input;
    let n_cols = test_case.n_cols;
    let expected_output = test_case.output;
    let expected_cursor_pos = test_case.cursor_pos;
    let expected_line_numbers = JSON.stringify(test_case.line_numbers);

    let doc = new Doc();
    let vim = new Vim(doc);
    for (let inp of input) {
        if (typeof inp === "string") {
            inp = inp.split("");
        }
        for (let key of inp) {
            vim.process_input(key);
        }
    }

    let actual_grid = doc.put_on_grid_with_word_wrapping(n_cols);
    let actual_output = actual_grid.lines;
    let actual_cursor_pos = actual_grid.grid_head_pos;
    let actual_line_numbers = JSON.stringify(actual_grid.line_numbers);
    let results = []

    if (actual_output.length !== expected_output.length) {
        results.push({ name: test_case.name, code: -1, reason: "number of lines", actual: actual_output.length, expected: expected_output.length });
    } else {
        results.push({ name: test_case.name, code: 0, reason: "number of lines" });
    }

    if (
        actual_cursor_pos.i_row !== expected_cursor_pos.i_row
        || actual_cursor_pos.i_col !== expected_cursor_pos.i_col
    ) {
        results.push({ name: test_case.name, code: -1, reason: "cursor position", actual: actual_cursor_pos, expected: expected_cursor_pos });
    } else {
        results.push({ name: test_case.name, code: 0, reason: "cursor position" });
    }

    actual_output = actual_output.map(row => row.join("")).join("\n");
    expected_output = expected_output.join("\n");
    if (actual_output !== expected_output) {
        results.push({ name: test_case.name, code: -1, reason: "text", actual: actual_output, expected: expected_output });
    } else {
        results.push({ name: test_case.name, code: 0, reason: "text" });
    }

    if (actual_line_numbers !== expected_line_numbers) {
        results.push({ name: test_case.name, code: -1, reason: "line numbers", actual: actual_line_numbers, expected: expected_line_numbers });
    } else {
        results.push({ name: test_case.name, code: 0, reason: "line numbers" });
    }

    return results;
}
