# AI Traveler - UI 设计风格指南

本文档定义了 AI Traveler 客户端的视觉设计规范，旨在确保应用界面的一致性、美观性与可用性。本规范基于 **Material UI v5** 主题系统与 **Tailwind CSS** 实用类构建。

---

## 1. 颜色系统 (Color System)

### 品牌色 (Brand Colors)
*   **Primary (主色)**: `#667eea` (紫蓝色) - 用于主要按钮、激活状态、高亮元素。
*   **Secondary (次要色)**: `#764ba2` (深紫色) - 用于辅助元素、渐变色终点。
*   **Gradient (品牌渐变)**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` - 广泛用于标题文字、主按钮背景、特殊卡片背景。

### 功能色 (Functional Colors)
基于 MUI 标准 Palette：
*   **Success (成功)**: `#2e7d32` (Green) - 用于“已完成”状态、Activity 类型。
*   **Warning (警告)**: `#ed6c02` (Orange) - 用于“进行中”状态、Food 类型。
*   **Info (信息)**: `#0288d1` (Blue) - 用于“规划中”状态、Culture 类型。
*   **Error (错误)**: `#d32f2f` (Red) - 用于“已取消”状态、删除操作、错误提示。

### 背景色 (Backgrounds)
*   **App Background**: `#f5f5f5` 或 `#f5f7fa` (浅灰) - 应用整体背景色。
*   **Surface (卡片/容器)**: `#ffffff` (纯白) - 内容承载区域。
*   **TitleBar**: 透明或与背景同色，内容滚动时不遮挡。

---

## 2. 排版系统 (Typography)

*   **Font Family**: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`
*   **Global Style**: 默认 `font-weight: 400`，强调内容使用 `600` 或 `bold`。

### 渐变标题设计
页面的一级标题 (H4/H5) 统一采用品牌渐变色填充，增加视觉冲击力。
```tsx
<Typography
  variant="h4"
  fontWeight="bold"
  sx={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }}
>
  页面标题
</Typography>
```

---

## 3. 组件样式规范 (Component Styles)

### 按钮 (Buttons)
*   **Primary Button**: 使用品牌渐变背景，`textTransform: 'none'` (取消全大写)，`fontWeight: 600`。
    ```tsx
    <Button
      variant="contained"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        '&:hover': {
           background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
        }
      }}
    >
      主要操作
    </Button>
    ```

### 卡片 (Cards)
*   **Border Radius**: `8px` (MUI theme `shape.borderRadius` 默认值)。
*   **Shadow**: 默认使用柔和阴影 `boxShadow: '0 4px 20px rgba(0,0,0,0.1)'`。
*   **Hover Effect**: 悬浮时增加阴影深度并轻微上浮。
    ```tsx
    sx={{
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': {
        boxShadow: 4, // MUI shadow level 4
        transform: 'translateY(-2px)'
      }
    }}
    ```

### 自定义滚动条 (Scrollbar)
全局隐藏默认滚动条，以获得更简洁的桌面应用体验，但在可滚动区域保持滚动功能。
```css
/* App.tsx */
scrollbar-width: none; /* Firefox */
&::-webkit-scrollbar { display: none; } /* Chrome/Safari */
```

---

## 4. 状态与类型映射 (Status & Mapping)

### 行程状态 (Trip Status)
| 状态枚举 | 显示标签 | 颜色 (Color) |
| :--- | :--- | :--- |
| `PLANNING` | 规划中 | **Info** (Blue) |
| `IN_PROGRESS` | 进行中 | **Warning** (Orange) |
| `COMPLETED` | 已完成 | **Success** (Green) |
| `CANCELLED` | 已取消 | **Error** (Red) |

### 消费类型 (Expense Categories)
| 类型 | 图标示例 | 颜色 |
| :--- | :--- | :--- |
| `TRANSPORTATION` | DirectionsCar | `#42a5f5` (Blue) |
| `ACCOMMODATION` | Hotel | `#ab47bc` (Purple) |
| `DINING` | Restaurant | `#ef5350` (Red) |
| `SIGHTSEEING` | CameraAlt | `#66bb6a` (Green) |
| `SHOPPING` | ShoppingBag | `#ffa726` (Orange) |

---

## 5. 交互规范 (Interaction)

*   **Dialogs**: 添加/编辑操作一律使用模态对话框 (Dialog)，宽度通常设为 `maxWidth="sm"`。
*   **Drag & Drop**: 在行程规划中，支持拖拽排序和跨天移动，拖拽时被拖元素透明度降低 (`opacity: 0.5`)。
*   **Hover**: 表格行、列表项在鼠标悬停时应有背景色变化 (`bg-gray-50` 或 `hover:bg-gray-100`) 和鼠标指针变为手型 (`cursor-pointer`)。
