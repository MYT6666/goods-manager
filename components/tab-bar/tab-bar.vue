<template>
	<view class="tab-bar">
		<view
			v-for="(tab, index) in tabs"
			:key="index"
			class="tab-item"
			:class="{ active: currentIndex === index, 'center-item': tab.isAdd }"
			@click="switchTab(index)"
		>
			<!-- 中间悬浮 + 按钮 -->
			<view v-if="tab.isAdd" class="fab-btn">
				<uni-icons type="plusempty" size="28" color="#FFFFFF"></uni-icons>
			</view>

			<!-- 普通 Tab -->
			<template v-else>
				<uni-icons
					:type="currentIndex === index ? tab.filledIcon : tab.icon"
					:size="24"
					:color="currentIndex === index ? '#4F46E5' : '#9CA3AF'"
				></uni-icons>
				<text
					class="tab-label"
					:class="{ 'label-active': currentIndex === index }"
				>{{ tab.label }}</text>
			</template>
		</view>
	</view>
</template>

<script>
const tabPages = [
	'/pages/index/index',
	'/pages/goods/goods',
	'/pages/add/add',
	'/pages/checkout/checkout',
	'/pages/profile/profile'
];

export default {
	name: 'TabBar',
	props: {
		currentIndex: {
			type: Number,
			default: 0
		}
	},
	data() {
		return {
			tabs: [
				{ icon: 'home',        filledIcon: 'home-filled',   label: '首页' },
				{ icon: 'shop',        filledIcon: 'shop-filled',   label: '商品' },
				{ isAdd: true },
				{ icon: 'cart',        filledIcon: 'cart-filled',   label: '购物车' },
				{ icon: 'person',      filledIcon: 'person-filled', label: '我的' }
			]
		};
	},
	methods: {
		switchTab(index) {
			if (index === this.currentIndex) return;
			uni.switchTab({ url: tabPages[index] });
		}
	}
};
</script>

<style lang="scss" scoped>
.tab-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 120rpx;
	background: #FFFFFF;
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding-bottom: env(safe-area-inset-bottom);
	box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.04);
	z-index: 999;
}

.tab-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	transition: transform 0.15s;

	&:active {
		transform: scale(0.92);
	}
}

.tab-label {
	font-size: 22rpx;
	color: #9CA3AF;
	margin-top: 4rpx;
	transition: color 0.2s;
}

.label-active {
	color: #4F46E5;
	font-weight: 600;
}

/* ===== 中间悬浮 + 按钮 ===== */
.center-item {
	position: relative;
}

.fab-btn {
	width: 104rpx;
	height: 104rpx;
	background: linear-gradient(135deg, #4F46E5, #6366F1);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: -56rpx;
	box-shadow: 0 12rpx 32rpx rgba(79, 70, 229, 0.3);

	&:active {
		transform: scale(0.92);
	}
}
</style>
