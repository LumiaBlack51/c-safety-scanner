#include <stdio.h>
#include <stdlib.h>

// 二叉搜索树节点结构
typedef struct TreeNode {
    int data;
    struct TreeNode* left;
    struct TreeNode* right;
} TreeNode;

// 创建新节点
TreeNode* createNode(int data) {
    TreeNode* newNode = (TreeNode*)malloc(sizeof(TreeNode));
    if (newNode) {
        newNode->data = data;
        newNode->left = NULL;
        newNode->right = NULL;
    }
    return newNode;
}

// 插入节点
TreeNode* insertNode(TreeNode* root, int data) {
    if (root == NULL) {
        return createNode(data);
    }
    
    if (data < root->data) {
        root->left = insertNode(root->left, data);
    } else if (data > root->data) {
        root->right = insertNode(root->right, data);
    }
    
    return root;
}

// 查找节点
TreeNode* searchNode(TreeNode* root, int data) {
    if (root == NULL || root->data == data) {
        return root;
    }
    
    if (data < root->data) {
        return searchNode(root->left, data);
    } else {
        return searchNode(root->right, data);
    }
}

// 查找最小节点
TreeNode* findMinNode(TreeNode* root) {
    while (root && root->left) {
        root = root->left;
    }
    return root;
}

// 删除节点
TreeNode* deleteNode(TreeNode* root, int data) {
    if (root == NULL) {
        return root;
    }
    
    if (data < root->data) {
        root->left = deleteNode(root->left, data);
    } else if (data > root->data) {
        root->right = deleteNode(root->right, data);
    } else {
        // 要删除的节点
        if (root->left == NULL) {
            TreeNode* temp = root->right;
            free(root);
            return temp;
        } else if (root->right == NULL) {
            TreeNode* temp = root->left;
            free(root);
            return temp;
        }
        
        // 有两个子节点的情况
        TreeNode* temp = findMinNode(root->right);
        root->data = temp->data;
        root->right = deleteNode(root->right, temp->data);
    }
    
    return root;
}

// 中序遍历
void inOrderTraversal(TreeNode* root) {
    if (root) {
        inOrderTraversal(root->left);
        printf("%d ", root->data);
        inOrderTraversal(root->right);
    }
}

// 前序遍历
void preOrderTraversal(TreeNode* root) {
    if (root) {
        printf("%d ", root->data);
        preOrderTraversal(root->left);
        preOrderTraversal(root->right);
    }
}

// 后序遍历
void postOrderTraversal(TreeNode* root) {
    if (root) {
        postOrderTraversal(root->left);
        postOrderTraversal(root->right);
        printf("%d ", root->data);
    }
}

// 释放整个树
void freeTree(TreeNode* root) {
    if (root) {
        freeTree(root->left);
        freeTree(root->right);
        free(root);
    }
}

// 计算树的高度
int calculateHeight(TreeNode* root) {
    if (root == NULL) {
        return 0;
    }
    
    int leftHeight = calculateHeight(root->left);
    int rightHeight = calculateHeight(root->right);
    
    return (leftHeight > rightHeight ? leftHeight : rightHeight) + 1;
}

// 计算节点数量
int countNodes(TreeNode* root) {
    if (root == NULL) {
        return 0;
    }
    
    return 1 + countNodes(root->left) + countNodes(root->right);
}

// 检查是否为二叉搜索树
int isBST(TreeNode* root, int min, int max) {
    if (root == NULL) {
        return 1;
    }
    
    if (root->data < min || root->data > max) {
        return 0;
    }
    
    return isBST(root->left, min, root->data - 1) && 
           isBST(root->right, root->data + 1, max);
}

// 测试函数
void testBinaryTree() {
    printf("=== 二叉搜索树测试开始 ===\n");
    
    TreeNode* root = NULL;
    
    // 插入测试数据
    int testData[] = {50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45, 55, 65, 75, 85};
    int dataSize = sizeof(testData) / sizeof(testData[0]);
    
    printf("插入测试数据...\n");
    for (int i = 0; i < dataSize; i++) {
        root = insertNode(root, testData[i]);
    }
    
    printf("插入完成，树高度：%d\n", calculateHeight(root));
    printf("节点数量：%d\n", countNodes(root));
    
    printf("\n中序遍历：");
    inOrderTraversal(root);
    printf("\n");
    
    printf("\n前序遍历：");
    preOrderTraversal(root);
    printf("\n");
    
    printf("\n后序遍历：");
    postOrderTraversal(root);
    printf("\n");
    
    // 测试搜索
    printf("\n搜索测试：\n");
    int searchKeys[] = {30, 100, 20, 80, 5};
    for (int i = 0; i < 5; i++) {
        TreeNode* found = searchNode(root, searchKeys[i]);
        if (found) {
            printf("找到键 %d\n", searchKeys[i]);
        } else {
            printf("未找到键 %d\n", searchKeys[i]);
        }
    }
    
    // 测试删除
    printf("\n删除测试：\n");
    int deleteKeys[] = {30, 50, 70, 20, 10};
    for (int i = 0; i < 5; i++) {
        printf("删除键 %d\n", deleteKeys[i]);
        root = deleteNode(root, deleteKeys[i]);
        printf("删除后节点数量：%d，高度：%d\n", countNodes(root), calculateHeight(root));
    }
    
    printf("\n删除后中序遍历：");
    inOrderTraversal(root);
    printf("\n");
    
    // 验证BST性质
    printf("\n验证BST性质：%s\n", isBST(root, INT_MIN, INT_MAX) ? "是" : "否");
    
    // 清理内存
    freeTree(root);
    
    printf("\n=== 二叉搜索树测试完成 ===\n");
}

int main() {
    printf("二叉搜索树实现测试程序\n");
    printf("======================\n");
    
    testBinaryTree();
    
    printf("\n所有测试完成！\n");
    return 0;
}
