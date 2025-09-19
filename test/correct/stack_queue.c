#include <stdio.h>
#include <stdlib.h>

#define MAX_SIZE 100

// 栈结构
typedef struct Stack {
    int* data;
    int top;
    int capacity;
} Stack;

// 队列结构
typedef struct Queue {
    int* data;
    int front;
    int rear;
    int size;
    int capacity;
} Queue;

// 创建栈
Stack* createStack(int capacity) {
    Stack* stack = (Stack*)malloc(sizeof(Stack));
    if (stack) {
        stack->data = (int*)malloc(capacity * sizeof(int));
        if (stack->data) {
            stack->top = -1;
            stack->capacity = capacity;
        } else {
            free(stack);
            stack = NULL;
        }
    }
    return stack;
}

// 创建队列
Queue* createQueue(int capacity) {
    Queue* queue = (Queue*)malloc(sizeof(Queue));
    if (queue) {
        queue->data = (int*)malloc(capacity * sizeof(int));
        if (queue->data) {
            queue->front = 0;
            queue->rear = -1;
            queue->size = 0;
            queue->capacity = capacity;
        } else {
            free(queue);
            queue = NULL;
        }
    }
    return queue;
}

// 栈操作
int isStackEmpty(Stack* stack) {
    return stack->top == -1;
}

int isStackFull(Stack* stack) {
    return stack->top == stack->capacity - 1;
}

void push(Stack* stack, int value) {
    if (!isStackFull(stack)) {
        stack->data[++stack->top] = value;
    }
}

int pop(Stack* stack) {
    if (!isStackEmpty(stack)) {
        return stack->data[stack->top--];
    }
    return -1;
}

int peek(Stack* stack) {
    if (!isStackEmpty(stack)) {
        return stack->data[stack->top];
    }
    return -1;
}

int getStackSize(Stack* stack) {
    return stack->top + 1;
}

void printStack(Stack* stack) {
    printf("栈内容 (从顶到底): ");
    for (int i = stack->top; i >= 0; i--) {
        printf("%d ", stack->data[i]);
    }
    printf("\n");
}

void freeStack(Stack* stack) {
    if (stack) {
        free(stack->data);
        free(stack);
    }
}

// 队列操作
int isQueueEmpty(Queue* queue) {
    return queue->size == 0;
}

int isQueueFull(Queue* queue) {
    return queue->size == queue->capacity;
}

void enqueue(Queue* queue, int value) {
    if (!isQueueFull(queue)) {
        queue->rear = (queue->rear + 1) % queue->capacity;
        queue->data[queue->rear] = value;
        queue->size++;
    }
}

int dequeue(Queue* queue) {
    if (!isQueueEmpty(queue)) {
        int value = queue->data[queue->front];
        queue->front = (queue->front + 1) % queue->capacity;
        queue->size--;
        return value;
    }
    return -1;
}

int front(Queue* queue) {
    if (!isQueueEmpty(queue)) {
        return queue->data[queue->front];
    }
    return -1;
}

int rear(Queue* queue) {
    if (!isQueueEmpty(queue)) {
        return queue->data[queue->rear];
    }
    return -1;
}

int getQueueSize(Queue* queue) {
    return queue->size;
}

void printQueue(Queue* queue) {
    printf("队列内容 (从前到后): ");
    for (int i = 0; i < queue->size; i++) {
        int index = (queue->front + i) % queue->capacity;
        printf("%d ", queue->data[index]);
    }
    printf("\n");
}

void freeQueue(Queue* queue) {
    if (queue) {
        free(queue->data);
        free(queue);
    }
}

// 测试栈
void testStack() {
    printf("=== 栈测试开始 ===\n");
    
    Stack* stack = createStack(10);
    if (!stack) {
        printf("创建栈失败\n");
        return;
    }
    
    printf("初始栈大小: %d\n", getStackSize(stack));
    printf("栈是否为空: %s\n", isStackEmpty(stack) ? "是" : "否");
    
    // 测试入栈
    printf("\n测试入栈操作...\n");
    push(stack, 10);
    push(stack, 20);
    push(stack, 30);
    push(stack, 40);
    push(stack, 50);
    
    printf("入栈后栈大小: %d\n", getStackSize(stack));
    printf("栈顶元素: %d\n", peek(stack));
    printStack(stack);
    
    // 测试出栈
    printf("\n测试出栈操作...\n");
    int value = pop(stack);
    printf("出栈元素: %d\n", value);
    printf("出栈后栈顶元素: %d\n", peek(stack));
    printStack(stack);
    
    // 测试栈满
    printf("\n测试栈满情况...\n");
    for (int i = 0; i < 10; i++) {
        push(stack, i + 100);
    }
    printf("栈是否满: %s\n", isStackFull(stack) ? "是" : "否");
    printf("尝试入栈 999: ");
    push(stack, 999);
    printf("栈顶元素: %d\n", peek(stack));
    
    // 测试栈空
    printf("\n测试栈空情况...\n");
    while (!isStackEmpty(stack)) {
        printf("出栈: %d\n", pop(stack));
    }
    printf("栈是否为空: %s\n", isStackEmpty(stack) ? "是" : "否");
    
    freeStack(stack);
    printf("\n=== 栈测试完成 ===\n");
}

// 测试队列
void testQueue() {
    printf("=== 队列测试开始 ===\n");
    
    Queue* queue = createQueue(10);
    if (!queue) {
        printf("创建队列失败\n");
        return;
    }
    
    printf("初始队列大小: %d\n", getQueueSize(queue));
    printf("队列是否为空: %s\n", isQueueEmpty(queue) ? "是" : "否");
    
    // 测试入队
    printf("\n测试入队操作...\n");
    enqueue(queue, 10);
    enqueue(queue, 20);
    enqueue(queue, 30);
    enqueue(queue, 40);
    enqueue(queue, 50);
    
    printf("入队后队列大小: %d\n", getQueueSize(queue));
    printf("队首元素: %d\n", front(queue));
    printf("队尾元素: %d\n", rear(queue));
    printQueue(queue);
    
    // 测试出队
    printf("\n测试出队操作...\n");
    int value = dequeue(queue);
    printf("出队元素: %d\n", value);
    printf("出队后队首元素: %d\n", front(queue));
    printQueue(queue);
    
    // 测试队列满
    printf("\n测试队列满情况...\n");
    for (int i = 0; i < 10; i++) {
        enqueue(queue, i + 100);
    }
    printf("队列是否满: %s\n", isQueueFull(queue) ? "是" : "否");
    printf("队首元素: %d, 队尾元素: %d\n", front(queue), rear(queue));
    
    // 测试队列空
    printf("\n测试队列空情况...\n");
    while (!isQueueEmpty(queue)) {
        printf("出队: %d\n", dequeue(queue));
    }
    printf("队列是否为空: %s\n", isQueueEmpty(queue) ? "是" : "否");
    
    freeQueue(queue);
    printf("\n=== 队列测试完成 ===\n");
}

// 测试栈和队列的组合使用
void testStackQueueCombination() {
    printf("=== 栈和队列组合测试开始 ===\n");
    
    Stack* stack = createStack(20);
    Queue* queue = createQueue(20);
    
    if (!stack || !queue) {
        printf("创建栈或队列失败\n");
        freeStack(stack);
        freeQueue(queue);
        return;
    }
    
    // 使用栈实现队列（两个栈）
    printf("使用两个栈实现队列...\n");
    Stack* stack1 = createStack(20);
    Stack* stack2 = createStack(20);
    
    // 入队操作：将元素压入stack1
    printf("入队操作: ");
    for (int i = 1; i <= 5; i++) {
        push(stack1, i);
        printf("%d ", i);
    }
    printf("\n");
    
    // 出队操作：将stack1的元素转移到stack2，然后从stack2弹出
    printf("出队操作: ");
    while (!isStackEmpty(stack1)) {
        push(stack2, pop(stack1));
    }
    while (!isStackEmpty(stack2)) {
        printf("%d ", pop(stack2));
    }
    printf("\n");
    
    // 使用队列实现栈（两个队列）
    printf("\n使用两个队列实现栈...\n");
    Queue* queue1 = createQueue(20);
    Queue* queue2 = createQueue(20);
    
    // 入栈操作：将元素入队到queue1
    printf("入栈操作: ");
    for (int i = 1; i <= 5; i++) {
        enqueue(queue1, i);
        printf("%d ", i);
    }
    printf("\n");
    
    // 出栈操作：将queue1的元素转移到queue2，保留最后一个元素出队
    printf("出栈操作: ");
    while (getQueueSize(queue1) > 1) {
        enqueue(queue2, dequeue(queue1));
    }
    printf("%d ", dequeue(queue1));
    while (!isQueueEmpty(queue2)) {
        enqueue(queue1, dequeue(queue2));
    }
    while (!isQueueEmpty(queue1)) {
        printf("%d ", dequeue(queue1));
    }
    printf("\n");
    
    freeStack(stack);
    freeQueue(queue);
    freeStack(stack1);
    freeStack(stack2);
    freeQueue(queue1);
    freeQueue(queue2);
    
    printf("\n=== 栈和队列组合测试完成 ===\n");
}

int main() {
    printf("栈和队列实现测试程序\n");
    printf("===================\n");
    
    testStack();
    testQueue();
    testStackQueueCombination();
    
    printf("\n所有测试完成！\n");
    return 0;
}
