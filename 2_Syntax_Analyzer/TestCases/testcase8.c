// test case to check loop statements



int main() {
    int i, a, b;
    float nume = 3.45;
    
    // for loop to iterate from 0 to 9
    for (i = 0; i < 10; i++) {
        a = i;
    }

    // while loop to decrement from 10 to 1
    while (i > 0) {
        b = i;
        i--;
    }

    // do-while loop to increment from 1 to 5
    i = 1;
   

    // nested for loop to create a 2D pattern
    for (int row = 0; row < 5; row++) {
        for (int col = 0; col < row + 1; col++) {
            printf("* ");
        }
        printf("\n");
    }

    // switch-case statement to demonstrate multiple cases
    switch (a) {
        case 0:
            printf("a is 0\n");
            break;
        case 1:
            printf("a is 1\n");
            break;
        default:
            printf("a is neither 0 nor 1\n");
    }

    return 0;
}

