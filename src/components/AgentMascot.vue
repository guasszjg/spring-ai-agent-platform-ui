<template>
  <!--
    AgentMatrix 智能体形象：圆润方形身体 + 竖向双眼 + 顶部信号天线。
    animated：眨眼 + 天线光点呼吸；inverse：用于品牌色背景（白身体、品牌色眼睛）。
  -->
  <svg
    class="agent-mascot"
    :class="{ inverse, animated }"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path class="am-antenna" d="M32 19V10.5" />
    <circle class="am-signal" cx="32" cy="8" r="4.2" />
    <circle class="am-signal-core" cx="32" cy="8" r="2.6" />
    <rect class="am-body" x="11" y="19" width="42" height="37" rx="15" />
    <g class="am-eyes">
      <rect class="am-eye" x="22" y="31" width="5.5" height="10" rx="2.75" />
      <rect class="am-eye" x="36.5" y="31" width="5.5" height="10" rx="2.75" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: Number, default: 40 },
  inverse: { type: Boolean, default: false },
  animated: { type: Boolean, default: false }
})
</script>

<style scoped>
.agent-mascot {
  display: block;
  flex-shrink: 0;
  overflow: visible;
}

.am-body {
  fill: var(--brand-strong, #c15f3c);
}

.am-eye {
  fill: #fff8f2;
}

.am-antenna {
  stroke: var(--brand-strong, #c15f3c);
  stroke-width: 2.6;
  stroke-linecap: round;
}

.am-signal {
  fill: var(--brand, #d97757);
  opacity: 0.28;
}

.am-signal-core {
  fill: var(--brand, #d97757);
}

/* 反色：放在品牌色背景上 */
.inverse .am-body,
.inverse .am-signal-core {
  fill: #ffffff;
}

.inverse .am-signal {
  fill: #ffffff;
  opacity: 0.35;
}

.inverse .am-antenna {
  stroke: #ffffff;
}

.inverse .am-eye {
  fill: var(--brand-strong, #c15f3c);
}

/* 动画：偶尔眨眼 + 天线信号呼吸 */
.animated .am-eyes {
  transform-box: fill-box;
  transform-origin: center;
  animation: am-blink 5.5s ease-in-out infinite;
}

.animated .am-signal {
  transform-box: fill-box;
  transform-origin: center;
  animation: am-pulse 2.4s ease-in-out infinite;
}

@keyframes am-blink {
  0%, 44%, 50%, 100% { transform: scaleY(1); }
  47% { transform: scaleY(0.12); }
}

@keyframes am-pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.2; }
  50% { transform: scale(1.35); opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .animated .am-eyes,
  .animated .am-signal {
    animation: none;
  }
}
</style>
