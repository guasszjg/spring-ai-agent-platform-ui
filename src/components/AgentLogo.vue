<template>
  <!-- 品牌标志：品牌色圆角方块 + 白色智能体形象（与 AgentMascot 同一造型） -->
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
    <g transform="translate(0.64 1.6) scale(0.48)">
      <path class="mark-antenna" d="M32 19V10.5" />
      <circle class="mark-fill" cx="32" cy="8" r="3.4" />
      <rect class="mark-fill" x="11" y="19" width="42" height="37" rx="15" />
      <rect class="mark-eye" x="22" y="31" width="5.5" height="10" rx="2.75" />
      <rect class="mark-eye" x="36.5" y="31" width="5.5" height="10" rx="2.75" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: Number,
    default: 32
  },
  // 反色：用于品牌色背景之上（白底方块 + 品牌色形象）
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

.mark-fill {
  fill: #ffffff;
}

.mark-antenna {
  stroke: #ffffff;
  stroke-width: 3.4;
  stroke-linecap: round;
}

.mark-eye {
  fill: var(--brand-strong, #c15f3c);
}

.inverse .mark-bg {
  fill: #ffffff;
}

.inverse .mark-fill {
  fill: var(--brand-strong, #c15f3c);
}

.inverse .mark-antenna {
  stroke: var(--brand-strong, #c15f3c);
}

.inverse .mark-eye {
  fill: #ffffff;
}
</style>
