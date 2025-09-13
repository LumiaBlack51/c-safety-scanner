#include <stdiox.h> // BUG: Header misspelling
int main(){
 int x; // BUG: uninitialized
 int *p; // BUG: wild pointer
 printf("%s %d", x, 123); // BUG: type mismatch
 scanf("%d", x); // BUG: missing &
 for(;;){ if(x>0) break; } // BUG: likely infinite
 *p = 1; // BUG: deref wild pointer
 return 0; }
