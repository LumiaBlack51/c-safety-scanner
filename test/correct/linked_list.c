#include <stdio.h>
#include <stdlib.h>

// 链表节点结构
typedef struct ListNode {
    int data;
    struct ListNode* next;
} ListNode;

// 创建新节点
ListNode* createNode(int data) {
    ListNode* newNode = (ListNode*)malloc(sizeof(ListNode));
    if (newNode) {
        newNode->data = data;
        newNode->next = NULL;
    }
    return newNode;
}

// 在链表头部插入节点
ListNode* insertAtHead(ListNode* head, int data) {
    ListNode* newNode = createNode(data);
    if (newNode) {
        newNode->next = head;
        head = newNode;
    }
    return head;
}

// 在链表尾部插入节点
ListNode* insertAtTail(ListNode* head, int data) {
    ListNode* newNode = createNode(data);
    if (head == NULL) {
        return newNode;
    }
    
    ListNode* current = head;
    while (current->next) {
        current = current->next;
    }
    current->next = newNode;
    return head;
}

// 在指定位置插入节点
ListNode* insertAtPosition(ListNode* head, int data, int position) {
    if (position <= 0) {
        return insertAtHead(head, data);
    }
    
    ListNode* newNode = createNode(data);
    if (newNode == NULL) {
        return head;
    }
    
    ListNode* current = head;
    for (int i = 0; i < position - 1 && current; i++) {
        current = current->next;
    }
    
    if (current) {
        newNode->next = current->next;
        current->next = newNode;
    }
    
    return head;
}

// 删除指定值的节点
ListNode* deleteNode(ListNode* head, int data) {
    if (head == NULL) {
        return head;
    }
    
    if (head->data == data) {
        ListNode* temp = head;
        head = head->next;
        free(temp);
        return head;
    }
    
    ListNode* current = head;
    while (current->next && current->next->data != data) {
        current = current->next;
    }
    
    if (current->next) {
        ListNode* temp = current->next;
        current->next = current->next->next;
        free(temp);
    }
    
    return head;
}

// 删除指定位置的节点
ListNode* deleteAtPosition(ListNode* head, int position) {
    if (head == NULL || position < 0) {
        return head;
    }
    
    if (position == 0) {
        ListNode* temp = head;
        head = head->next;
        free(temp);
        return head;
    }
    
    ListNode* current = head;
    for (int i = 0; i < position - 1 && current->next; i++) {
        current = current->next;
    }
    
    if (current->next) {
        ListNode* temp = current->next;
        current->next = current->next->next;
        free(temp);
    }
    
    return head;
}

// 查找节点
ListNode* searchNode(ListNode* head, int data) {
    ListNode* current = head;
    while (current) {
        if (current->data == data) {
            return current;
        }
        current = current->next;
    }
    return NULL;
}

// 获取链表长度
int getLength(ListNode* head) {
    int length = 0;
    ListNode* current = head;
    while (current) {
        length++;
        current = current->next;
    }
    return length;
}

// 获取指定位置的节点
ListNode* getNodeAt(ListNode* head, int position) {
    ListNode* current = head;
    for (int i = 0; i < position && current; i++) {
        current = current->next;
    }
    return current;
}

// 反转链表
ListNode* reverseList(ListNode* head) {
    ListNode* prev = NULL;
    ListNode* current = head;
    ListNode* next = NULL;
    
    while (current) {
        next = current->next;
        current->next = prev;
        prev = current;
        current = next;
    }
    
    return prev;
}

// 打印链表
void printList(ListNode* head) {
    ListNode* current = head;
    printf("链表内容: ");
    while (current) {
        printf("%d ", current->data);
        current = current->next;
    }
    printf("\n");
}

// 释放整个链表
void freeList(ListNode* head) {
    ListNode* current = head;
    while (current) {
        ListNode* temp = current;
        current = current->next;
        free(temp);
    }
}

// 复制链表
ListNode* copyList(ListNode* head) {
    if (head == NULL) {
        return NULL;
    }
    
    ListNode* newHead = createNode(head->data);
    ListNode* newCurrent = newHead;
    ListNode* current = head->next;
    
    while (current) {
        newCurrent->next = createNode(current->data);
        newCurrent = newCurrent->next;
        current = current->next;
    }
    
    return newHead;
}

// 合并两个有序链表
ListNode* mergeSortedLists(ListNode* list1, ListNode* list2) {
    ListNode* dummy = createNode(0);
    ListNode* current = dummy;
    
    while (list1 && list2) {
        if (list1->data <= list2->data) {
            current->next = list1;
            list1 = list1->next;
        } else {
            current->next = list2;
            list2 = list2->next;
        }
        current = current->next;
    }
    
    if (list1) {
        current->next = list1;
    } else {
        current->next = list2;
    }
    
    ListNode* result = dummy->next;
    free(dummy);
    return result;
}

// 测试函数
void testLinkedList() {
    printf("=== 链表测试开始 ===\n");
    
    ListNode* head = NULL;
    
    // 测试插入
    printf("测试插入操作...\n");
    head = insertAtHead(head, 10);
    head = insertAtHead(head, 20);
    head = insertAtTail(head, 30);
    head = insertAtTail(head, 40);
    head = insertAtPosition(head, 25, 2);
    
    printf("插入后链表长度: %d\n", getLength(head));
    printList(head);
    
    // 测试搜索
    printf("\n测试搜索操作...\n");
    ListNode* found = searchNode(head, 25);
    if (found) {
        printf("找到节点 25\n");
    } else {
        printf("未找到节点 25\n");
    }
    
    found = searchNode(head, 100);
    if (found) {
        printf("找到节点 100\n");
    } else {
        printf("未找到节点 100\n");
    }
    
    // 测试删除
    printf("\n测试删除操作...\n");
    head = deleteNode(head, 25);
    printf("删除节点 25 后: ");
    printList(head);
    
    head = deleteAtPosition(head, 0);
    printf("删除位置 0 后: ");
    printList(head);
    
    // 测试反转
    printf("\n测试反转操作...\n");
    head = reverseList(head);
    printf("反转后: ");
    printList(head);
    
    // 测试复制
    printf("\n测试复制操作...\n");
    ListNode* copiedList = copyList(head);
    printf("复制的链表: ");
    printList(copiedList);
    
    // 测试合并
    printf("\n测试合并操作...\n");
    ListNode* list1 = NULL;
    ListNode* list2 = NULL;
    
    list1 = insertAtTail(list1, 1);
    list1 = insertAtTail(list1, 3);
    list1 = insertAtTail(list1, 5);
    
    list2 = insertAtTail(list2, 2);
    list2 = insertAtTail(list2, 4);
    list2 = insertAtTail(list2, 6);
    
    printf("链表1: ");
    printList(list1);
    printf("链表2: ");
    printList(list2);
    
    ListNode* mergedList = mergeSortedLists(list1, list2);
    printf("合并后: ");
    printList(mergedList);
    
    // 清理内存
    freeList(head);
    freeList(copiedList);
    freeList(mergedList);
    
    printf("\n=== 链表测试完成 ===\n");
}

int main() {
    printf("链表实现测试程序\n");
    printf("================\n");
    
    testLinkedList();
    
    printf("\n所有测试完成！\n");
    return 0;
}
