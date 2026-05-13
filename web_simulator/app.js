class CompilerSimulator {
    constructor() {
        this.sourceCode = "";
        this.cleanedSourceCode = "";
        this.tokens = [];
        this.parseTree = null;
        this.intermediateCode = [];
        this.symbolTable = [];
        this.error = null;
        this.pos = 0;
        this.tempNo = 0;
        this.labelNo = 0;
    }

    // Phase 1: Lexical Analyzer
    isPunctuator(ch) {
        return [' ', '+', '-', '*', '/', ',', ';', '>', '<', '=', '!', '(', ')', '[', ']', '{', '}', '&', '|', '#', '.', '\t', '\n', '\r'].includes(ch);
    }

    isOperator(ch) {
        return ['+', '-', '*', '/', '>', '<', '=', '!', '|', '&'].includes(ch);
    }

    isKeyword(str) {
        const keywords = ["if", "else", "while", "do", "break", "continue", "int", "double", "float", "return", "char", "string", "case", "long", "short", "typedef", "switch", "unsigned", "void", "static", "struct", "sizeof", "volatile", "enum", "const", "union", "extern", "bool", "for", "using", "namespace"];
        return keywords.includes(str);
    }

    isTypeKeyword(str) {
        return ["int", "float", "double", "char", "string", "void", "bool", "long", "short"].includes(str);
    }

    isNumber(str) {
        if (str.length === 0) return false;
        let numOfDecimal = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '.') {
                numOfDecimal++;
                if (numOfDecimal > 1) return false;
            } else if (!(/[0-9]/.test(str[i])) && !(str[i] === '-' && i === 0)) {
                return false;
            }
        }
        return true;
    }

    validIdentifier(str) {
        if (/[0-9]/.test(str[0]) || this.isPunctuator(str[0])) return false;
        for (let i = 1; i < str.length; i++) {
            if (this.isPunctuator(str[i])) return false;
        }
        return true;
    }

    formatTokenType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    addToken(val, type, pos) {
        const line = this.getLineInfo(pos);
        const token = { val, type, line };
        this.tokens.push(token);
        this.symbolTable.push({
            id: this.symbolTable.length + 1,
            name: val,
            type: this.formatTokenType(type),
            line
        });
    }

    getLineInfo(pos) {
        let line = 1;
        for (let i = 0; i < pos && i < this.sourceCode.length; i++) {
            if (this.sourceCode[i] === '\n') line++;
        }
        return line;
    }

    stripComments(rawInput) {
        let input = "";
        let i = 0;
        while (i < rawInput.length) {
            if (rawInput[i] === '"' || rawInput[i] === "'") {
                const quote = rawInput[i];
                input += rawInput[i++];
                while (i < rawInput.length && rawInput[i] !== quote) {
                    if (rawInput[i] === '\\') {
                        input += rawInput[i++];
                        if (i < rawInput.length) {
                            input += rawInput[i++];
                        }
                        continue;
                    }
                    input += rawInput[i++];
                }
                if (i < rawInput.length) input += rawInput[i++];
            } else if (rawInput[i] === '/' && rawInput[i+1] === '/') {
                while (i < rawInput.length && rawInput[i] !== '\n') {
                    input += ' ';
                    i++;
                }
            } else if (rawInput[i] === '/' && rawInput[i+1] === '*') {
                while (i < rawInput.length && !(rawInput[i] === '*' && rawInput[i+1] === '/')) {
                    input += (rawInput[i] === '\n') ? '\n' : ' ';
                    i++;
                }
                if (i < rawInput.length - 1) {
                    input += '  ';
                    i += 2;
                }
            } else {
                input += rawInput[i++];
            }
        }
        return input;
    }

    lexicalAnalysis(rawInput) {
        this.sourceCode = rawInput;
        this.cleanedSourceCode = this.stripComments(rawInput);

        // Comments are replaced with whitespace, preserving newlines for accurate line numbers.
        let input = this.cleanedSourceCode;

        this.tokens = [];
        this.symbolTable = [];
        let left = 0, right = 0;
        let len = input.length;

        while (right <= len && left <= right) {
            if (left < len && input[left] === '"') {
                right = left + 1;
                while (right < len && input[right] !== '"') {
                    if (input[right] === '\\') right++;
                    right++;
                }
                if (right < len) right++; // consume closing quote
                let sub = input.substring(left, right);
                this.addToken(sub, 'string', left);
                left = right;
                continue;
            }

            if (right < len && !this.isPunctuator(input[right])) {
                right++;
            }
            if (right < len && this.isPunctuator(input[right]) && left === right) {
                if (this.isOperator(input[right])) {
                    const twoCharOperator =
                        (input[right + 1] === '=' && ['>', '<', '=', '!'].includes(input[right])) ||
                        (input[right + 1] === input[right] && ['+', '-', '&', '|'].includes(input[right]));
                    this.addToken(twoCharOperator ? input.substring(right, right + 2) : input[right], 'operator', right);
                    if (twoCharOperator) right++;
                } else if (![' ', '\t', '\n', '\r'].includes(input[right])) {
                    this.addToken(input[right], 'punctuator', right);
                }
                right++;
                left = right;
            } else if ((right < len && this.isPunctuator(input[right]) && left !== right) || (right === len && left !== right)) {
                let sub = input.substring(left, right);
                let type = 'invalid';

                if (this.isKeyword(sub)) {
                    type = 'keyword';
                } else if (this.isNumber(sub)) {
                    type = 'number';
                } else if (this.validIdentifier(sub)) {
                    type = 'identifier';
                }

                this.addToken(sub, type, left);
                
                left = right;
            } else {
                if (right === len) break;
            }
        }
    }

    // Phase 2: Syntax Analyzer (Recursive Descent Parser)
    skipWhitespace() {
        while (this.pos < this.sourceCode.length && [' ', '\t', '\n', '\r'].includes(this.sourceCode[this.pos])) {
            this.pos++;
        }
    }

    getCurrentWord() {
        this.skipWhitespace();
        const match = this.sourceCode.slice(this.pos).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
        return match ? match[0] : "";
    }

    readIdentifier() {
        this.skipWhitespace();
        let ident = "";
        while (this.pos < this.sourceCode.length && /[a-zA-Z0-9_]/.test(this.sourceCode[this.pos])) {
            ident += this.sourceCode[this.pos++];
        }
        return ident;
    }

    expectChar(ch) {
        this.skipWhitespace();
        if (this.sourceCode[this.pos] !== ch) {
            throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected '${ch}'`);
        }
        this.pos++;
    }

    skipUntil(chars) {
        while (this.pos < this.sourceCode.length && !chars.includes(this.sourceCode[this.pos])) {
            this.pos++;
        }
    }

    matchOperator(operators) {
        this.skipWhitespace();
        for (const op of operators) {
            if (this.sourceCode.startsWith(op, this.pos)) {
                this.pos += op.length;
                return op;
            }
        }
        return null;
    }

    parseCondition() {
        this.skipWhitespace();
        let wrappedInParens = false;
        if (this.sourceCode[this.pos] === '(') {
            wrappedInParens = true;
            this.pos++;
        }

        let node = this.parseComparison();
        this.skipWhitespace();

        if (wrappedInParens) {
            if (this.sourceCode[this.pos] === ')') {
                this.pos++;
            } else {
                throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected ')'`);
            }
        }

        return node;
    }

    parseComparison() {
        let node = this.parseExpression();
        const op = this.matchOperator(['>=', '<=', '==', '!=', '>', '<']);
        if (op) {
            const rhs = this.parseExpression();
            if (!rhs) throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected expression after '${op}'`);
            node = { label: op, children: [node, rhs].filter(Boolean) };
        }
        return node;
    }

    parseAssignmentExpression() {
        let node = this.parseComparison();
        this.skipWhitespace();
        if (this.sourceCode[this.pos] === '=' && this.sourceCode[this.pos + 1] !== '=') {
            this.pos++;
            const rhs = this.parseAssignmentExpression();
            node = { label: "=", children: [node, rhs].filter(Boolean) };
        }
        return node;
    }

    parsePreprocessorDirective() {
        this.skipUntil(['\n', '\r']);
        return { label: "preprocessor", children: [] };
    }

    parseUsingNamespace() {
        this.pos += "using".length;
        const namespaceWord = this.readIdentifier();
        const namespaceName = this.readIdentifier();
        this.skipWhitespace();
        if (this.sourceCode[this.pos] === ';') this.pos++;
        return {
            label: "using namespace",
            children: [
                { label: namespaceWord || "namespace", children: [] },
                { label: namespaceName || "std", children: [] }
            ]
        };
    }

    parseDeclarationOrFunction() {
        const typeName = this.readIdentifier();
        const name = this.readIdentifier();
        if (!name) {
            throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected identifier after '${typeName}'`);
        }

        this.skipWhitespace();
        if (this.sourceCode[this.pos] === '(') {
            this.pos++;
            const params = [];
            this.skipWhitespace();
            while (this.pos < this.sourceCode.length && this.sourceCode[this.pos] !== ')') {
                const paramType = this.readIdentifier();
                const paramName = this.readIdentifier();
                if (paramType) {
                    params.push({
                        label: "param",
                        children: [
                            { label: paramType, children: [] },
                            ...(paramName ? [{ label: paramName, children: [] }] : [])
                        ]
                    });
                }
                this.skipWhitespace();
                if (this.sourceCode[this.pos] === ',') this.pos++;
                this.skipWhitespace();
            }
            this.expectChar(')');
            this.skipWhitespace();
            if (this.sourceCode[this.pos] === '{') {
                const body = this.parseStatement();
                return {
                    label: "function",
                    children: [
                        { label: typeName, children: [] },
                        { label: name, children: [] },
                        { label: "params", children: params },
                        body
                    ].filter(Boolean)
                };
            }
            if (this.sourceCode[this.pos] === ';') this.pos++;
            return { label: "function declaration", children: [{ label: typeName, children: [] }, { label: name, children: [] }] };
        }

        let node = {
            label: "decl",
            children: [{ label: typeName, children: [] }, { label: name, children: [] }]
        };

        this.skipWhitespace();
        if (this.sourceCode[this.pos] === '=') {
            this.pos++;
            const value = this.parseAssignmentExpression();
            node.children.push(value);
        }
        this.skipWhitespace();
        if (this.sourceCode[this.pos] === ';') this.pos++;
        return node;
    }

    parseForStatement() {
        this.pos += 3;
        this.expectChar('(');

        let init = null;
        this.skipWhitespace();
        if (this.sourceCode[this.pos] !== ';') {
            init = this.isTypeKeyword(this.getCurrentWord())
                ? this.parseDeclarationOrFunction()
                : this.parseAssignmentExpression();
        }
        this.skipWhitespace();
        if (this.sourceCode[this.pos] === ';') this.pos++;

        let cond = null;
        this.skipWhitespace();
        if (this.sourceCode[this.pos] !== ';') {
            cond = this.parseComparison();
        }
        this.expectChar(';');

        let step = null;
        this.skipWhitespace();
        if (this.sourceCode[this.pos] !== ')') {
            step = this.parseAssignmentExpression();
        }
        this.expectChar(')');

        const body = this.parseStatement();
        return { label: "for", children: [init, cond, step, body].filter(Boolean) };
    }

    parseStatement() {
        this.skipWhitespace();
        let input = this.sourceCode;
        if (this.pos >= input.length) return null;

        const word = this.getCurrentWord();

        if (input[this.pos] === '#') {
            return this.parsePreprocessorDirective();
        } else if (word === "using") {
            return this.parseUsingNamespace();
        } else if (this.isTypeKeyword(word)) {
            return this.parseDeclarationOrFunction();
        } else if (input.startsWith("if", this.pos) && !/[a-zA-Z0-9]/.test(input[this.pos + 2] || ' ')) {
            this.pos += 2;
            let cond = this.parseCondition();
            let body = this.parseStatement();
            return { label: "if", children: [cond, body].filter(Boolean) };
        } else if (input.startsWith("while", this.pos) && !/[a-zA-Z0-9]/.test(input[this.pos + 5] || ' ')) {
            this.pos += 5;
            let cond = this.parseCondition();
            let body = this.parseStatement();
            return { label: "while", children: [cond, body].filter(Boolean) };
        } else if (input.startsWith("for", this.pos) && !/[a-zA-Z0-9]/.test(input[this.pos + 3] || ' ')) {
            return this.parseForStatement();
        } else if (input[this.pos] === '{') {
            this.pos++;
            let block = { label: "block", children: [] };
            this.skipWhitespace();
            while (this.pos < input.length && input[this.pos] !== '}') {
                let stmt = this.parseStatement();
                if (stmt) block.children.push(stmt);
                this.skipWhitespace();
            }
            if (input[this.pos] === '}') {
                this.pos++;
            } else {
                throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected '}'`);
            }
            return block;
        } else {
            let node = this.parseAssignmentExpression();
            this.skipWhitespace();
            if (this.pos < input.length && input[this.pos] === ';') {
                this.pos++;
            }
            return node;
        }
    }

    parseExpression() {
        this.skipWhitespace();
        let node = this.parseTerm();
        this.skipWhitespace();
        let input = this.sourceCode;
        while (this.pos < input.length && (input[this.pos] === '+' || input[this.pos] === '-')) {
            let op = input[this.pos++];
            let rhs = this.parseTerm();
            if (!rhs) throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected expression after '${op}'`);
            this.skipWhitespace();
            node = { label: op, children: [node, rhs].filter(Boolean) };
        }
        return node;
    }

    parseTerm() {
        this.skipWhitespace();
        let node = this.parseFactor();
        this.skipWhitespace();
        let input = this.sourceCode;
        while (this.pos < input.length && (input[this.pos] === '*' || input[this.pos] === '/')) {
            let op = input[this.pos++];
            let rhs = this.parseFactor();
            if (!rhs) throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected expression after '${op}'`);
            this.skipWhitespace();
            node = { label: op, children: [node, rhs].filter(Boolean) };
        }
        return node;
    }

    parseFactor() {
        this.skipWhitespace();
        let input = this.sourceCode;
        if (this.pos >= input.length) throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Unexpected end of input`);

        if (/[0-9]/.test(input[this.pos])) {
            let num = "";
            while (this.pos < input.length && /[0-9]/.test(input[this.pos])) {
                num += input[this.pos++];
            }
            return { label: num, children: [] };
        } else if (input[this.pos] === '(') {
            this.pos++;
            let node = this.parseAssignmentExpression();
            this.skipWhitespace();
            if (this.pos < input.length && input[this.pos] === ')') {
                this.pos++;
            } else {
                throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Expected ')'`);
            }
            return node;
        } else if (/[a-zA-Z_]/.test(input[this.pos])) {
            let ident = "";
            while (this.pos < input.length && /[a-zA-Z0-9_]/.test(input[this.pos])) {
                ident += input[this.pos++];
            }
            // Check for keywords that shouldn't be parsed as simple identifiers in expressions
            const keywords = ["int", "float", "double", "char", "string", "void", "return"];
            if (keywords.includes(ident)) {
                // If it's a type declaration like "int x", handle it or skip type
                this.skipWhitespace();
                if (this.pos < input.length && /[a-zA-Z]/.test(input[this.pos])) {
                    let varName = "";
                    while (this.pos < input.length && /[a-zA-Z0-9_]/.test(input[this.pos])) {
                        varName += input[this.pos++];
                    }
                    return { label: "decl", children: [{ label: ident, children: [] }, { label: varName, children: [] }] };
                }
            }
            this.skipWhitespace();
            if (input.startsWith("++", this.pos) || input.startsWith("--", this.pos)) {
                const op = input.substring(this.pos, this.pos + 2);
                this.pos += 2;
                return { label: op, children: [{ label: ident, children: [] }] };
            }
            return { label: ident, children: [] };
        } else if (input[this.pos] === '"' || input[this.pos] === "'") {
            const quote = input[this.pos++];
            let value = quote;
            while (this.pos < input.length && input[this.pos] !== quote) {
                if (input[this.pos] === '\\') {
                    value += input[this.pos++];
                    if (this.pos < input.length) value += input[this.pos++];
                    continue;
                }
                value += input[this.pos++];
            }
            if (this.pos < input.length) {
                value += input[this.pos++];
            } else {
                throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Unterminated string literal`);
            }
            return { label: value, children: [] };
        } else if (input[this.pos] === ';') {
            return null; // Handle stray semicolons
        }
        
        throw new Error(`Syntax Error at line ${this.getLineInfo(this.pos)}: Unexpected token '${input[this.pos]}'`);
    }

    syntaxAnalysis() {
        this.pos = 0;
        const originalSource = this.sourceCode;
        this.sourceCode = this.cleanedSourceCode || this.sourceCode;
        let statements = [];
        try {
            this.skipWhitespace();
            while (this.pos < this.sourceCode.length) {
                let stmt = this.parseStatement();
                if (stmt) statements.push(stmt);
                this.skipWhitespace();
            }
        } finally {
            this.sourceCode = originalSource;
        }
        
        if (statements.length === 1) {
            this.parseTree = statements[0];
        } else if (statements.length > 1) {
            this.parseTree = { label: "program", children: statements };
        } else {
            this.parseTree = null;
        }
    }

    getAnalysisSource() {
        return this.cleanedSourceCode || this.sourceCode;
    }

    // Phase 3: Intermediate Code Generator (Three Address Code)
    newTemp() {
        return `t${this.tempNo++}`;
    }

    newLabel() {
        return `L${this.labelNo++}`;
    }

    isBinaryOperator(label) {
        return ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!='].includes(label);
    }

    generateExpressionICG(node) {
        if (!node) return "";

        if (node.label === "decl") {
            const name = node.children[1]?.label || "";
            if (node.children[2]) {
                const value = this.generateExpressionICG(node.children[2]);
                this.intermediateCode.push(`${name} = ${value}`);
            }
            return name;
        }

        if (node.label === "=") {
            const target = this.generateExpressionICG(node.children[0]);
            const value = this.generateExpressionICG(node.children[1]);
            this.intermediateCode.push(`${target} = ${value}`);
            return target;
        }

        if (this.isBinaryOperator(node.label)) {
            const left = this.generateExpressionICG(node.children[0]);
            const right = this.generateExpressionICG(node.children[1]);
            const temp = this.newTemp();
            this.intermediateCode.push(`${temp} = ${left} ${node.label} ${right}`);
            return temp;
        }

        if (node.label === "++" || node.label === "--") {
            const target = this.generateExpressionICG(node.children[0]);
            const temp = this.newTemp();
            const op = node.label === "++" ? "+" : "-";
            this.intermediateCode.push(`${temp} = ${target} ${op} 1`);
            this.intermediateCode.push(`${target} = ${temp}`);
            return target;
        }

        return node.label;
    }

    generateStatementICG(node) {
        if (!node) return;

        if (node.label === "program" || node.label === "block") {
            node.children.forEach(child => this.generateStatementICG(child));
            return;
        }

        if (node.label === "function") {
            const name = node.children[1]?.label || "function";
            this.intermediateCode.push(`${name}:`);
            this.generateStatementICG(node.children[node.children.length - 1]);
            return;
        }

        if (node.label === "preprocessor" || node.label === "using namespace" || node.label === "params") {
            return;
        }

        if (node.label === "if") {
            const falseLabel = this.newLabel();
            const endLabel = this.newLabel();
            const condition = this.generateExpressionICG(node.children[0]);
            this.intermediateCode.push(`ifFalse ${condition} goto ${falseLabel}`);
            this.generateStatementICG(node.children[1]);
            this.intermediateCode.push(`goto ${endLabel}`);
            this.intermediateCode.push(`${falseLabel}:`);
            this.intermediateCode.push(`${endLabel}:`);
            return;
        }

        if (node.label === "while") {
            const startLabel = this.newLabel();
            const endLabel = this.newLabel();
            this.intermediateCode.push(`${startLabel}:`);
            const condition = this.generateExpressionICG(node.children[0]);
            this.intermediateCode.push(`ifFalse ${condition} goto ${endLabel}`);
            this.generateStatementICG(node.children[1]);
            this.intermediateCode.push(`goto ${startLabel}`);
            this.intermediateCode.push(`${endLabel}:`);
            return;
        }

        if (node.label === "for") {
            const startLabel = this.newLabel();
            const endLabel = this.newLabel();
            const [init, condition, step, body] = node.children;
            this.generateStatementICG(init);
            this.intermediateCode.push(`${startLabel}:`);
            if (condition) {
                const conditionTemp = this.generateExpressionICG(condition);
                this.intermediateCode.push(`ifFalse ${conditionTemp} goto ${endLabel}`);
            }
            this.generateStatementICG(body);
            this.generateStatementICG(step);
            this.intermediateCode.push(`goto ${startLabel}`);
            this.intermediateCode.push(`${endLabel}:`);
            return;
        }

        this.generateExpressionICG(node);
    }

    generateIntermediateCode(node) {
        this.intermediateCode = [];
        this.tempNo = 0;
        this.labelNo = 0;
        this.generateStatementICG(node);
    }

    run(input) {
        this.error = null;
        try {
            this.lexicalAnalysis(input);
            this.syntaxAnalysis();
            this.generateIntermediateCode(this.parseTree);
        } catch (e) {
            this.error = e.message;
        }
    }
}

// UI Controllers
let editor;
document.addEventListener('DOMContentLoaded', () => {
    const sourceCodeTextarea = document.getElementById('sourceCode');
    editor = CodeMirror.fromTextArea(sourceCodeTextarea, {
        lineNumbers: true,
        mode: "text/x-csrc",
        theme: "material-darker",
        indentUnit: 4,
        matchBrackets: true,
        autoCloseBrackets: true
    });
    editor.setSize("100%", "100%");
});

const compileBtn = document.getElementById('compileBtn');
const errorBox = document.getElementById('errorBox');
const tokensOutput = document.getElementById('tokensOutput');
const treeOutput = document.getElementById('treeOutput');
const icgOutput = document.getElementById('icgOutput');
const symbolTableOutput = document.getElementById('symbolTableOutput').querySelector('tbody');

// Tabs logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

compileBtn.addEventListener('click', () => {
    const code = editor.getValue().trim();
    if (!code) {
        showError("Please enter some source code to simulate.");
        return;
    }

    errorBox.classList.add('hidden');
    
    const simulator = new CompilerSimulator();
    simulator.run(code);

    if (simulator.error) {
        showError(simulator.error);
        // Even if there's a syntax error, we can still show the lexical tokens and symbol table found so far
        renderTokens(simulator.tokens);
        renderSymbolTable(simulator.symbolTable);
        treeOutput.innerHTML = '<div class="empty-state">Parse tree not generated due to syntax error.</div>';
        icgOutput.innerHTML = '<div class="empty-state">Intermediate code not generated due to syntax error.</div>';
        return;
    }

    renderTokens(simulator.tokens);
    renderTree(simulator.parseTree);
    renderIntermediateCode(simulator.intermediateCode);
    renderSymbolTable(simulator.symbolTable);
});

function showError(msg) {
    errorBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
    errorBox.classList.remove('hidden');
}

function renderTokens(tokens) {
    tokensOutput.innerHTML = '';
    if (tokens.length === 0) {
        tokensOutput.innerHTML = '<div class="empty-state">No tokens generated.</div>';
        return;
    }
    tokens.forEach((t, index) => {
        const el = document.createElement('div');
        el.className = `token-card ${t.type}`;
        el.style.animationDelay = `${index * 0.03}s`;
        
        const valEl = document.createElement('span');
        valEl.className = 'token-val';
        valEl.textContent = t.val;
        
        const typeEl = document.createElement('span');
        typeEl.className = 'token-type';
        typeEl.textContent = t.type;
        
        el.appendChild(valEl);
        el.appendChild(typeEl);
        tokensOutput.appendChild(el);
    });
}

function renderTree(node) {
    treeOutput.innerHTML = '';
    if (!node) {
        treeOutput.innerHTML = '<div class="empty-state">Invalid syntax or empty tree.</div>';
        return;
    }

    function createNodeElement(n, delayCounter) {
        if (!n) return null;
        const div = document.createElement('div');
        div.className = 'tree-node';
        div.style.animationDelay = `${delayCounter.val * 0.03}s`;
        delayCounter.val++;
        
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = n.label;
        div.appendChild(label);
        
        if (n.children && n.children.length > 0) {
            n.children.forEach(child => {
                const childEl = createNodeElement(child, delayCounter);
                if (childEl) div.appendChild(childEl);
            });
        }
        
        return div;
    }

    const counter = { val: 0 };
    treeOutput.appendChild(createNodeElement(node, counter));
}

function renderIntermediateCode(lines) {
    icgOutput.innerHTML = '';
    if (!lines || lines.length === 0) {
        icgOutput.innerHTML = '<div class="empty-state">No intermediate code generated.</div>';
        return;
    }
    
    lines.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'icg-line';
        el.textContent = item;
        el.style.animationDelay = `${index * 0.03}s`;
        icgOutput.appendChild(el);
    });
}

function renderSymbolTable(symbols) {
    symbolTableOutput.innerHTML = '';
    if (!symbols || symbols.length === 0) {
        symbolTableOutput.innerHTML = '<tr><td colspan="4" class="empty-state text-center">No symbols found.</td></tr>';
        return;
    }
    
    symbols.forEach((sym, index) => {
        const tr = document.createElement('tr');
        tr.style.animation = `fadeIn 0.3s ease-out backwards`;
        tr.style.animationDelay = `${index * 0.05}s`;
        
        tr.innerHTML = `
            <td>${sym.id}</td>
            <td style="color: var(--info); font-weight: 500;">${sym.name}</td>
            <td><span style="padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.05); font-size: 0.8rem; text-transform: uppercase;">${sym.type}</span></td>
            <td>Line ${sym.line}</td>
        `;
        symbolTableOutput.appendChild(tr);
    });
}
