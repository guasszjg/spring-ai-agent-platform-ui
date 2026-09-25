<template>
  <!-- 品牌标志：品牌色圆角方块 + 线条 "A" -->
  <svg
    class="agent-logo-mark"
    :class="{ inverse }"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" class="mark-bg" />
    <path d="M9.5 22.5 16 9.5l6.5 13" class="mark-line" />
    <path d="M12.25 17.5h7.5" class="mark-line" />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: Number,
    default: 32
  },
  // 反色：用于品牌色背景之上（白底 + 品牌色线条）
  inverse: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.agent-logo-mark {
  display: block;
  flex-shrink: 0;
}

.mark-bg {
  fill: var(--brand-strong, #c15f3c);
}

.inverse .mark-bg {
  fill: #ffffff;
}

.mark-line {
  stroke: #ffffff;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.inverse .mark-line {
  stroke: var(--brand-strong, #c15f3c);
}
</style>
