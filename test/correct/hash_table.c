#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TABLE_SIZE 100

// 哈希表节点结构
typedef struct HashNode {
    char* key;
    int value;
    struct HashNode* next;
} HashNode;

// 哈希表结构
typedef struct HashTable {
    HashNode** buckets;
    int size;
} HashTable;

// 创建哈希表
HashTable* createHashTable() {
    HashTable* table = (HashTable*)malloc(sizeof(HashTable));
    if (table) {
        table->buckets = (HashNode**)calloc(TABLE_SIZE, sizeof(HashNode*));
        table->size = TABLE_SIZE;
    }
    return table;
}

// 哈希函数
unsigned int hashFunction(const char* key) {
    unsigned int hash = 0;
    while (*key) {
        hash = hash * 31 + *key;
        key++;
    }
    return hash % TABLE_SIZE;
}

// 插入键值对
int insert(HashTable* table, const char* key, int value) {
    if (!table || !key) {
        return 0;
    }
    
    unsigned int index = hashFunction(key);
    HashNode* newNode = (HashNode*)malloc(sizeof(HashNode));
    if (!newNode) {
        return 0;
    }
    
    newNode->key = (char*)malloc(strlen(key) + 1);
    if (!newNode->key) {
        free(newNode);
        return 0;
    }
    
    strcpy(newNode->key, key);
    newNode->value = value;
    newNode->next = table->buckets[index];
    table->buckets[index] = newNode;
    
    return 1;
}

// 查找值
int get(HashTable* table, const char* key) {
    if (!table || !key) {
        return -1;
    }
    
    unsigned int index = hashFunction(key);
    HashNode* current = table->buckets[index];
    
    while (current) {
        if (strcmp(current->key, key) == 0) {
            return current->value;
        }
        current = current->next;
    }
    
    return -1;
}

// 删除键值对
int removeKey(HashTable* table, const char* key) {
    if (!table || !key) {
        return 0;
    }
    
    unsigned int index = hashFunction(key);
    HashNode* current = table->buckets[index];
    HashNode* prev = NULL;
    
    while (current) {
        if (strcmp(current->key, key) == 0) {
            if (prev) {
                prev->next = current->next;
            } else {
                table->buckets[index] = current->next;
            }
            
            free(current->key);
            free(current);
            return 1;
        }
        prev = current;
        current = current->next;
    }
    
    return 0;
}

// 检查键是否存在
int contains(HashTable* table, const char* key) {
    return get(table, key) != -1;
}

// 获取哈希表大小（非空桶的数量）
int getSize(HashTable* table) {
    if (!table) {
        return 0;
    }
    
    int count = 0;
    for (int i = 0; i < table->size; i++) {
        HashNode* current = table->buckets[i];
        while (current) {
            count++;
            current = current->next;
        }
    }
    return count;
}

// 打印哈希表
void printHashTable(HashTable* table) {
    if (!table) {
        printf("哈希表为空\n");
        return;
    }
    
    printf("哈希表内容:\n");
    for (int i = 0; i < table->size; i++) {
        HashNode* current = table->buckets[i];
        if (current) {
            printf("桶 %d: ", i);
            while (current) {
                printf("(%s, %d) ", current->key, current->value);
                current = current->next;
            }
            printf("\n");
        }
    }
}

// 清空哈希表
void clear(HashTable* table) {
    if (!table) {
        return;
    }
    
    for (int i = 0; i < table->size; i++) {
        HashNode* current = table->buckets[i];
        while (current) {
            HashNode* temp = current;
            current = current->next;
            free(temp->key);
            free(temp);
        }
        table->buckets[i] = NULL;
    }
}

// 释放哈希表
void freeHashTable(HashTable* table) {
    if (table) {
        clear(table);
        free(table->buckets);
        free(table);
    }
}

// 获取所有键
char** getAllKeys(HashTable* table, int* count) {
    if (!table) {
        *count = 0;
        return NULL;
    }
    
    int size = getSize(table);
    char** keys = (char**)malloc(size * sizeof(char*));
    if (!keys) {
        *count = 0;
        return NULL;
    }
    
    int index = 0;
    for (int i = 0; i < table->size; i++) {
        HashNode* current = table->buckets[i];
        while (current) {
            keys[index] = (char*)malloc(strlen(current->key) + 1);
            strcpy(keys[index], current->key);
            index++;
            current = current->next;
        }
    }
    
    *count = size;
    return keys;
}

// 释放键数组
void freeKeys(char** keys, int count) {
    if (keys) {
        for (int i = 0; i < count; i++) {
            free(keys[i]);
        }
        free(keys);
    }
}

// 测试函数
void testHashTable() {
    printf("=== 哈希表测试开始 ===\n");
    
    HashTable* table = createHashTable();
    if (!table) {
        printf("创建哈希表失败\n");
        return;
    }
    
    // 测试插入
    printf("测试插入操作...\n");
    insert(table, "apple", 10);
    insert(table, "banana", 20);
    insert(table, "cherry", 30);
    insert(table, "date", 40);
    insert(table, "elderberry", 50);
    
    printf("插入后哈希表大小: %d\n", getSize(table));
    printHashTable(table);
    
    // 测试查找
    printf("\n测试查找操作...\n");
    int value = get(table, "apple");
    printf("apple 的值: %d\n", value);
    
    value = get(table, "banana");
    printf("banana 的值: %d\n", value);
    
    value = get(table, "grape");
    printf("grape 的值: %d\n", value);
    
    // 测试更新
    printf("\n测试更新操作...\n");
    insert(table, "apple", 15);
    value = get(table, "apple");
    printf("更新后 apple 的值: %d\n", value);
    
    // 测试删除
    printf("\n测试删除操作...\n");
    int removed = removeKey(table, "banana");
    printf("删除 banana: %s\n", removed ? "成功" : "失败");
    
    printf("删除后哈希表大小: %d\n", getSize(table));
    printHashTable(table);
    
    // 测试包含检查
    printf("\n测试包含检查...\n");
    printf("包含 apple: %s\n", contains(table, "apple") ? "是" : "否");
    printf("包含 banana: %s\n", contains(table, "banana") ? "是" : "否");
    printf("包含 cherry: %s\n", contains(table, "cherry") ? "是" : "否");
    
    // 测试获取所有键
    printf("\n测试获取所有键...\n");
    int keyCount;
    char** keys = getAllKeys(table, &keyCount);
    printf("所有键 (%d个): ", keyCount);
    for (int i = 0; i < keyCount; i++) {
        printf("%s ", keys[i]);
    }
    printf("\n");
    freeKeys(keys, keyCount);
    
    // 测试清空
    printf("\n测试清空操作...\n");
    clear(table);
    printf("清空后哈希表大小: %d\n", getSize(table));
    
    // 清理内存
    freeHashTable(table);
    
    printf("\n=== 哈希表测试完成 ===\n");
}

int main() {
    printf("哈希表实现测试程序\n");
    printf("==================\n");
    
    testHashTable();
    
    printf("\n所有测试完成！\n");
    return 0;
}
