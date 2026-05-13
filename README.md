# C Compiler Phases

This repository contains code and resources for various phases of a C compiler. Each phase is implemented separately to understand the workings of a compiler better.

## Lexical Analyzer

The lexical analyzer is the first phase of the compiler, responsible for converting the source code into a sequence of tokens. This phase removes comments, white spaces, and identifies keywords, identifiers, constants, operators, and punctuation symbols

### Usage

To use the lexical analyzer, you can compile the provided code (`lexAnalyzer.c`) using a Lex tool  ;

```bash
flex lexAnalyzer.l
gcc lex.yy.c 
a.exe < testCases/ifelse.c
```
The Symbol Table will be generated in symbolTable.txt file.
There is also a lex file to remove comments from a given .c file 

```bash
flex commentRemover.l
gcc lex.yy.c
a.exe < TestCases/ifelse.c
```

A new file called output.c will be created.

## Syntax Analyzer

In this phase syntax analyzers receive their inputs, in the form of tokens, from lexical analyzers.Checks the expressions from this token are syntactically correct and create a parse tree

### Usage

```bash
flex parseTree.l
yacc -d parseTree.y
gcc lex.yy.c y.tab.c
a.exe < TestCases/forloop.c
```
Parse tree will be printed in the terminal with its preorder traversal.

## Semantic Analyzer

In this phase, we extract necessary semantic information from the source code which is impossible to detect in parsing.

### Usage

```bash
flex scanner.l
yacc -d parser.y
gcc lex.yy.c y.tab.c
a.exe < TestCases/forloop.c
```

Parsing result will be printed in the terminal.

## Intermediate Code Generator

We are trying to generate language independent three-address code for a given source program which is lexically,syntactically and semantically correct.

### Usage

```bash
flex ICG.l
yacc -d ICG.y
gcc lex.yy.c y.tab.c
a.exe < TestCases/forloop.c
```
Output will be in ICG.txt file

## Code Optimizer

In this phase,the machine-independent code-optimization phase attempts to improve the intermediate code so that better target code will result. Usually better means
faster, but other objectives may be desired, such as shorter code, or target code that consumes less power.


### Usage
Paste ICG generated in previous phase in input.txt
```bash
python optimizer.py input.txt
```
Output will be in optimized_icg.txt


## Target Code Generator

The final phase in our compiler model is the code generator. It takes as input the intermediate representation (IR) produced by the front end of the compiler, along with relevant symbol table information, and produces semantically equivalent target programs.

### Usage
Paste ICG generated in previous phase in icg.txt
```bash
python assembly.py icg.txt
```
Output will be in icg.s
