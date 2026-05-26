<template>
	<view class="tab-bar">
		<view
			v-for="(tab, index) in tabs"
			:key="index"
			class="tab-item"
			:class="{ active: currentIndex === index, 'add-item': tab.isAdd }"
			@click="switchTab(index)"
		>
			<view v-if="tab.isAdd" class="add-btn">
				<uni-icons type="plusempty" size="28" color="#ffffff"></uni-icons>
			</view>
			<template v-else>
				<uni-icons
					:type="currentIndex === index ? tab.filledIcon : tab.icon"
					:size="24"
					:color="currentIndex === index ? activeColor : inactiveColor"
				></uni-icons>
				<text class="tab-label" :class="{ 'label-active': currentIndex === index }">{{ tab.label }}</text>
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
			activeColor: '#667eea',
			inactiveColor: '#b0b0b0',
			tabs: [
				{ icon: 'home', filledIcon: 'home-filled', label: '首页' },
				{ icon: 'shop', filledIcon: 'shop-filled', label: '商品' },
				{ isAdd: true },
				{ icon: 'cart', filledIcon: 'cart-filled', label: '购物车' },
				{ icon: 'person', filledIcon: 'person-filled', label: '我的' }
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

<style scoped>
.tab-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 110rpx;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: space-around;
	padding-bottom: env(safe-area-inset-bottom);
	box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.06);
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
}

.tab-item:active {
	transform: scale(0.92);
}

.tab-label {
	font-size: 22rpx;
	color: #b0b0b0;
	margin-top: 4rpx;
	transition: color 0.2s;
}

.tab-label.label-active {
	color: #667eea;
	font-weight: 600;
}

/* 中间添加按钮 */
.add-item {
	position: relative;
}

.add-btn {
	width: 100rpx;
	height: 100rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: -50rpx;
	box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.4);
	transition: transform 0.15s;
}

.add-item:active .add-btn {
	transform: scale(0.92);
}
</style>
