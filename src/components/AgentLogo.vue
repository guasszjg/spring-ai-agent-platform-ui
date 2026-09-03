<template>
  <div class="agent-brand-symbol" :style="{ width: size + 'px', height: size + 'px' }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="agent-logo-vector"
    >
      <defs>
        <!-- Gradients -->
        <linearGradient :id="'agentGradA_' + uid" x1="6" y1="6" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#c084fc" />
        </linearGradient>

        <linearGradient :id="'coreLight_' + uid" x1="17" y1="17" x2="27" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>

        <filter :id="'glowFilter_' + uid" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background Glow Aura -->
      <circle cx="22" cy="22" r="16" :fill="`url(#agentGradA_${uid})`" opacity="0.18" />

      <!-- Rotating Dashed Synaptic Ring -->
      <circle
        cx="22"
        cy="22"
        r="18.5"
        stroke="#38bdf8"
        stroke-width="1.2"
        stroke-dasharray="3 4.5"
        opacity="0.45"
        class="pulse-orbit-ring"
      />

      <!-- Outer Isometric Hexagonal Framework (Agent Boundary) -->
      <path
        d="M22 5L36.72 13.5V30.5L22 39L7.28 30.5V13.5L22 5Z"
        :stroke="`url(#agentGradA_${uid})`"
        stroke-width="2"
        stroke-linejoin="round"
        fill="rgba(10, 15, 30, 0.45)"
      />

      <!-- Tri-Fold Inner Facets (Perception, Memory, Execution) -->
      <line x1="22" y1="22" x2="7.28" y2="13.5" stroke="#38bdf8" stroke-width="1.4" opacity="0.65" />
      <line x1="22" y1="22" x2="36.72" y2="13.5" stroke="#818cf8" stroke-width="1.4" opacity="0.65" />
      <line x1="22" y1="22" x2="22" y2="39" stroke="#c084fc" stroke-width="1.4" opacity="0.65" />

      <!-- Three Autonomous Satellite Agent Nodes -->
      <circle cx="22" cy="5" r="3.2" fill="#00f5ff" :filter="`url(#glowFilter_${uid})`" />
      <circle cx="22" cy="5" r="1.3" fill="#ffffff" />

      <circle cx="36.72" cy="30.5" r="3.2" fill="#818cf8" :filter="`url(#glowFilter_${uid})`" />
      <circle cx="36.72" cy="30.5" r="1.3" fill="#ffffff" />

      <circle cx="7.28" cy="30.5" r="3.2" fill="#c084fc" :filter="`url(#glowFilter_${uid})`" />
      <circle cx="7.28" cy="30.5" r="1.3" fill="#ffffff" />

      <!-- Central Quantum Intelligence Core (The Brain / Singularity) -->
      <circle cx="22" cy="22" r="5.6" :fill="`url(#coreLight_${uid})`" :filter="`url(#glowFilter_${uid})`" />
      <circle cx="22" cy="22" r="2.2" fill="#ffffff" />

      <!-- Subtle Cyber Sparkles on Core -->
      <path d="M22 15L22.7 19.3L27 20L22.7 20.7L22 25L21.3 20.7L17 20L21.3 19.3Z" fill="#ffffff" opacity="0.65" />
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  size: {
    type: Number,
    default: 36
  }
})

// Unique ID to avoid SVG defs gradient collisions
const uid = Math.random().toString(36).substring(2, 9)
</script>

<style scoped>
.agent-brand-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.agent-logo-vector {
  display: block;
  overflow: visible;
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.4));
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.agent-brand-symbol:hover .agent-logo-vector {
  transform: scale(1.08);
  filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.7));
}

.pulse-orbit-ring {
  transform-origin: 22px 22px;
  animation: orbitRotate 22s linear infinite;
}

@keyframes orbitRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
