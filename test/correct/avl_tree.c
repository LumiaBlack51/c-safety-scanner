#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// AVL树节点结构体
typedef struct AVLNode {
    int key;
    int height;
    struct AVLNode* left;
    struct AVLNode* right;
} AVLNode;

// AVL树结构体
typedef struct AVLTree {
    AVLNode* root;
    int size;
} AVLTree;

// 创建新的AVL节点
AVLNode* createNode(int key) {
    AVLNode* node = (AVLNode*)malloc(sizeof(AVLNode));
    if (node) {
        node->key = key;
        node->height = 1;
        node->left = NULL;
        node->right = NULL;
    }
    return node;
}

// 创建新的AVL树
AVLTree* createAVLTree() {
    AVLTree* tree = (AVLTree*)malloc(sizeof(AVLTree));
    if (tree) {
        tree->root = NULL;
        tree->size = 0;
    }
    return tree;
}

// 获取节点高度
int getHeight(AVLNode* node) {
    return node ? node->height : 0;
}

// 更新节点高度
void updateHeight(AVLNode* node) {
    if (node) {
        int leftHeight = getHeight(node->left);
        int rightHeight = getHeight(node->right);
        node->height = (leftHeight > rightHeight ? leftHeight : rightHeight) + 1;
    }
}

// 获取平衡因子
int getBalance(AVLNode* node) {
    return node ? getHeight(node->left) - getHeight(node->right) : 0;
}

// 右旋转
AVLNode* rightRotate(AVLNode* y) {
    AVLNode* x = y->left;
    AVLNode* T2 = x->right;
    
    // 执行旋转
    x->right = y;
    y->left = T2;
    
    // 更新高度
    updateHeight(y);
    updateHeight(x);
    
    return x;
}

// 左旋转
AVLNode* leftRotate(AVLNode* x) {
    AVLNode* y = x->right;
    AVLNode* T2 = y->left;
    
    // 执行旋转
    y->left = x;
    x->right = T2;
    
    // 更新高度
    updateHeight(x);
    updateHeight(y);
    
    return y;
}

// 左右旋转（先左旋后右旋）
AVLNode* leftRightRotate(AVLNode* node) {
    node->left = leftRotate(node->left);
    return rightRotate(node);
}

// 右左旋转（先右旋后左旋）
AVLNode* rightLeftRotate(AVLNode* node) {
    node->right = rightRotate(node->right);
    return leftRotate(node);
}

// 插入节点
AVLNode* insertNode(AVLNode* node, int key) {
    // 1. 执行标准BST插入
    if (!node) {
        return createNode(key);
    }
    
    if (key < node->key) {
        node->left = insertNode(node->left, key);
    } else if (key > node->key) {
        node->right = insertNode(node->right, key);
    } else {
        // 相等的键不允许插入
        return node;
    }
    
    // 2. 更新祖先节点的高度
    updateHeight(node);
    
    // 3. 获取平衡因子
    int balance = getBalance(node);
    
    // 4. 如果不平衡，执行旋转
    // 左左情况
    if (balance > 1 && key < node->left->key) {
        return rightRotate(node);
    }
    
    // 右右情况
    if (balance < -1 && key > node->right->key) {
        return leftRotate(node);
    }
    
    // 左右情况
    if (balance > 1 && key > node->left->key) {
        return leftRightRotate(node);
    }
    
    // 右左情况
    if (balance < -1 && key < node->right->key) {
        return rightLeftRotate(node);
    }
    
    return node;
}

// 查找最小节点
AVLNode* findMinNode(AVLNode* node) {
    while (node && node->left) {
        node = node->left;
    }
    return node;
}

// 删除节点
AVLNode* deleteNode(AVLNode* root, int key) {
    // 1. 执行标准BST删除
    if (!root) {
        return root;
    }
    
    if (key < root->key) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->key) {
        root->right = deleteNode(root->right, key);
    } else {
        // 要删除的节点
        if (!root->left || !root->right) {
            AVLNode* temp = root->left ? root->left : root->right;
            
            // 没有子节点的情况
            if (!temp) {
                temp = root;
                root = NULL;
            } else {
                // 一个子节点的情况
                *root = *temp;
            }
            free(temp);
        } else {
            // 两个子节点的情况
            AVLNode* temp = findMinNode(root->right);
            root->key = temp->key;
            root->right = deleteNode(root->right, temp->key);
        }
    }
    
    // 如果树只有一个节点，返回
    if (!root) {
        return root;
    }
    
    // 2. 更新高度
    updateHeight(root);
    
    // 3. 获取平衡因子
    int balance = getBalance(root);
    
    // 4. 如果不平衡，执行旋转
    // 左左情况
    if (balance > 1 && getBalance(root->left) >= 0) {
        return rightRotate(root);
    }
    
    // 左右情况
    if (balance > 1 && getBalance(root->left) < 0) {
        return leftRightRotate(root);
    }
    
    // 右右情况
    if (balance < -1 && getBalance(root->right) <= 0) {
        return leftRotate(root);
    }
    
    // 右左情况
    if (balance < -1 && getBalance(root->right) > 0) {
        return rightLeftRotate(root);
    }
    
    return root;
}

// 查找节点
AVLNode* searchNode(AVLNode* root, int key) {
    if (!root || root->key == key) {
        return root;
    }
    
    if (key < root->key) {
        return searchNode(root->left, key);
    } else {
        return searchNode(root->right, key);
    }
}

// 中序遍历
void inOrderTraversal(AVLNode* root) {
    if (root) {
        inOrderTraversal(root->left);
        printf("%d ", root->key);
        inOrderTraversal(root->right);
    }
}

// 前序遍历
void preOrderTraversal(AVLNode* root) {
    if (root) {
        printf("%d ", root->key);
        preOrderTraversal(root->left);
        preOrderTraversal(root->right);
    }
}

// 后序遍历
void postOrderTraversal(AVLNode* root) {
    if (root) {
        postOrderTraversal(root->left);
        postOrderTraversal(root->right);
        printf("%d ", root->key);
    }
}

// 释放整个树
void freeTree(AVLNode* root) {
    if (root) {
        freeTree(root->left);
        freeTree(root->right);
        free(root);
    }
}

// 释放AVL树
void freeAVLTree(AVLTree* tree) {
    if (tree) {
        freeTree(tree->root);
        free(tree);
    }
}

// 计算树的高度
int calculateTreeHeight(AVLNode* root) {
    if (!root) {
        return 0;
    }
    
    int leftHeight = calculateTreeHeight(root->left);
    int rightHeight = calculateTreeHeight(root->right);
    
    return (leftHeight > rightHeight ? leftHeight : rightHeight) + 1;
}

// 验证AVL树性质
int isAVLTree(AVLNode* root) {
    if (!root) {
        return 1;
    }
    
    int balance = getBalance(root);
    if (balance < -1 || balance > 1) {
        return 0;
    }
    
    return isAVLTree(root->left) && isAVLTree(root->right);
}

// 打印树结构（用于调试）
void printTreeStructure(AVLNode* root, int space) {
    if (!root) {
        return;
    }
    
    space += 10;
    printTreeStructure(root->right, space);
    
    printf("\n");
    for (int i = 10; i < space; i++) {
        printf(" ");
    }
    printf("%d (h:%d, b:%d)\n", root->key, root->height, getBalance(root));
    
    printTreeStructure(root->left, space);
}

// 测试函数
void testAVLTree() {
    printf("=== AVL树测试开始 ===\n");
    
    // 创建AVL树
    AVLTree* tree = createAVLTree();
    if (!tree) {
        printf("错误：无法创建AVL树\n");
        return;
    }
    
    // 测试数据
    int testData[] = {10, 20, 30, 40, 50, 25, 15, 5, 35, 45, 55, 12, 8, 3, 7, 9, 11, 13, 14, 16, 18, 22, 28, 32, 38, 42, 48, 52, 58, 60};
    int dataSize = sizeof(testData) / sizeof(testData[0]);
    
    printf("插入测试数据...\n");
    for (int i = 0; i < dataSize; i++) {
        tree->root = insertNode(tree->root, testData[i]);
        tree->size++;
        
        // 验证AVL性质
        if (!isAVLTree(tree->root)) {
            printf("错误：插入%d后AVL性质被破坏\n", testData[i]);
        }
    }
    
    printf("插入完成，树大小：%d\n", tree->size);
    printf("树高度：%d\n", calculateTreeHeight(tree->root));
    
    printf("\n中序遍历：");
    inOrderTraversal(tree->root);
    printf("\n");
    
    printf("\n前序遍历：");
    preOrderTraversal(tree->root);
    printf("\n");
    
    printf("\n后序遍历：");
    postOrderTraversal(tree->root);
    printf("\n");
    
    // 测试搜索
    printf("\n搜索测试：\n");
    int searchKeys[] = {25, 100, 5, 60, 1};
    for (int i = 0; i < 5; i++) {
        AVLNode* found = searchNode(tree->root, searchKeys[i]);
        if (found) {
            printf("找到键 %d\n", searchKeys[i]);
        } else {
            printf("未找到键 %d\n", searchKeys[i]);
        }
    }
    
    // 测试删除
    printf("\n删除测试：\n");
    int deleteKeys[] = {25, 10, 50, 30, 5};
    for (int i = 0; i < 5; i++) {
        printf("删除键 %d\n", deleteKeys[i]);
        tree->root = deleteNode(tree->root, deleteKeys[i]);
        tree->size--;
        
        // 验证AVL性质
        if (!isAVLTree(tree->root)) {
            printf("错误：删除%d后AVL性质被破坏\n", deleteKeys[i]);
        }
        
        printf("删除后树大小：%d，高度：%d\n", tree->size, calculateTreeHeight(tree->root));
    }
    
    printf("\n删除后中序遍历：");
    inOrderTraversal(tree->root);
    printf("\n");
    
    // 测试边界情况
    printf("\n边界情况测试：\n");
    
    // 测试空树
    AVLTree* emptyTree = createAVLTree();
    printf("空树高度：%d\n", calculateTreeHeight(emptyTree->root));
    printf("空树是AVL树：%s\n", isAVLTree(emptyTree->root) ? "是" : "否");
    
    // 测试单节点
    emptyTree->root = insertNode(emptyTree->root, 42);
    printf("单节点树高度：%d\n", calculateTreeHeight(emptyTree->root));
    printf("单节点树是AVL树：%s\n", isAVLTree(emptyTree->root) ? "是" : "否");
    
    // 测试大量插入
    printf("\n大量插入测试：\n");
    for (int i = 1; i <= 1000; i++) {
        tree->root = insertNode(tree->root, i);
        if (i % 100 == 0) {
            printf("插入%d个节点后，树高度：%d\n", i, calculateTreeHeight(tree->root));
        }
    }
    
    printf("最终树大小：%d，高度：%d\n", tree->size + 1000, calculateTreeHeight(tree->root));
    printf("最终树是AVL树：%s\n", isAVLTree(tree->root) ? "是" : "否");
    
    // 清理内存
    freeAVLTree(tree);
    freeAVLTree(emptyTree);
    
    printf("\n=== AVL树测试完成 ===\n");
}

// 性能测试
void performanceTest() {
    printf("\n=== 性能测试开始 ===\n");
    
    AVLTree* tree = createAVLTree();
    if (!tree) {
        printf("错误：无法创建AVL树\n");
        return;
    }
    
    // 测试插入性能
    printf("测试插入性能...\n");
    for (int i = 1; i <= 10000; i++) {
        tree->root = insertNode(tree->root, i);
    }
    printf("插入10000个节点完成，树高度：%d\n", calculateTreeHeight(tree->root));
    
    // 测试搜索性能
    printf("测试搜索性能...\n");
    int found = 0;
    for (int i = 1; i <= 10000; i += 100) {
        if (searchNode(tree->root, i)) {
            found++;
        }
    }
    printf("搜索测试完成，找到%d个节点\n", found);
    
    // 测试删除性能
    printf("测试删除性能...\n");
    for (int i = 1; i <= 5000; i++) {
        tree->root = deleteNode(tree->root, i);
    }
    printf("删除5000个节点完成，剩余树高度：%d\n", calculateTreeHeight(tree->root));
    
    freeAVLTree(tree);
    printf("=== 性能测试完成 ===\n");
}

int main() {
    printf("AVL树实现测试程序\n");
    printf("==================\n");
    
    testAVLTree();
    performanceTest();
    
    printf("\n所有测试完成！\n");
    return 0;
}
