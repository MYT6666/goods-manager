<template>
	<view class="page">
		<!-- ===== 状态栏占位 ===== -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 欢迎卡片（毛玻璃） ===== -->
		<view class="welcome-card">
			<view class="welcome-left">
				<view class="avatar">
					<text class="avatar-text">{{ avatarChar }}</text>
				</view>
				<view class="welcome-info">
					<text class="greeting">{{ greetingText }}</text>
					<text class="welcome-name">{{ userInfo.username || 'boss1' }}，{{ timePeriod }}好</text>
				</view>
			</view>
			<view class="shop-capsule" v-if="userInfo && userInfo.shop_id">
				<uni-icons type="location-filled" size="14" color="#4F46E5"></uni-icons>
				<text class="shop-name">{{ shopName || 'YT厂库' }}</text>
			</view>
		</view>

		<!-- ===== 搜索栏 ===== -->
		<view class="search-section">
			<view class="search-box">
				<uni-icons type="search" size="18" color="#9CA3AF"></uni-icons>
				<input
					type="text"
					v-model="searchKeyword"
					placeholder="输入商品名称或条码"
					class="search-input"
					@confirm="handleSearch"
					confirm-type="search"
				/>
				<view class="search-clear" v-if="searchKeyword" @click="clearSearch">
					<uni-icons type="clear" size="16" color="#9CA3AF"></uni-icons>
				</view>
			</view>
		</view>

		<!-- ===== 功能卡片区（金刚区） ===== -->
		<view class="feature-grid">
			<!-- 扫码查价 -->
			<view class="feature-card card-scan" @click="scanCode">
				<view class="feature-icon-wrap icon-scan-bg">
					<uni-icons type="scan" size="32" color="#4F46E5"></uni-icons>
				</view>
				<text class="feature-label">扫码查价</text>
				<text class="feature-desc">扫描条码查价格</text>
			</view>

			<!-- 扫码结账 -->
			<view class="feature-card card-checkout" @click="goCheckout">
				<view class="feature-icon-wrap icon-checkout-bg">
					<uni-icons type="cart" size="32" color="#EF4444"></uni-icons>
				</view>
				<text class="feature-label">扫码结账</text>
				<text class="feature-desc">快速结算订单</text>
			</view>

			<!-- 新增商品 -->
			<view class="feature-card card-add" @click="goAdd">
				<view class="feature-icon-wrap icon-add-bg">
					<uni-icons type="plusempty" size="32" color="#10B981"></uni-icons>
				</view>
				<text class="feature-label">新增商品</text>
				<text class="feature-desc">录入新商品</text>
			</view>
		</view>

		<!-- ===== 扫码结果卡片 ===== -->
		<view class="result-section" v-if="scannedGoods">
			<view class="result-card">
				<view class="result-header">
					<text class="result-name">{{ scannedGoods.name }}</text>
					<view class="result-badge"><text>查询结果</text></view>
				</view>
				<view class="result-prices">
					<view class="price-item">
						<text class="price-label">进价</text>
						<text class="price-value">¥{{ formatPrice(scannedGoods.purchase_price) }}</text>
					</view>
					<view class="price-divider"></view>
					<view class="price-item">
						<text class="price-label">售价</text>
						<text class="price-value price-selling">¥{{ formatPrice(scannedGoods.selling_price) }}</text>
					</view>
					<view class="price-divider"></view>
					<view class="price-item">
						<text class="price-label">利润</text>
						<text class="price-value price-profit">¥{{ calculateProfit(scannedGoods) }}</text>
					</view>
				</view>
				<view class="result-barcode">
					<text class="barcode-label">条码</text>
					<text class="barcode-value">{{ scannedGoods.barcode }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 空状态 ===== -->
		<view class="empty-state" v-if="!scannedGoods && !searchKeyword">
			<view class="empty-icon-circle">
				<uni-icons type="scan" size="40" color="#4F46E5"></uni-icons>
			</view>
			<text class="empty-title">扫描商品条码</text>
			<text class="empty-sub">快速查询价格 / 扫码结账 / 添加新商品</text>
		</view>

		<!-- ===== 底部导航栏 ===== -->
		<tab-bar :currentIndex="0"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			statusBarHeight: 0,
			scannedGoods: null,
			searchKeyword: '',
			userInfo: null,
			shopName: ''
		};
	},
	computed: {
		greetingText() {
			const hour = new Date().getHours();
			if (hour < 6) return '夜深了，注意休息';
			if (hour < 12) return '早上好';
			if (hour < 14) return '中午好';
			if (hour < 18) return '下午好';
			return '晚上好';
		},
		timePeriod() {
			const hour = new Date().getHours();
			if (hour < 6) return '凌晨';
			if (hour < 12) return '上午';
			if (hour < 14) return '中午';
			if (hour < 18) return '下午';
			return '晚上';
		},
		avatarChar() {
			const name = (this.userInfo && this.userInfo.username) || 'boss';
			return name.charAt(0).toUpperCase();
		}
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20;
		this.userInfo = uni.getStorageSync('userInfo');
	},
	onShow() {
		uni.hideTabBar({ animation: false });
		this.userInfo = uni.getStorageSync('userInfo');
		this.loadShopName();
	},
	methods: {
		async loadShopName() {
			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) return;
				const res = await app.callFunction({
					name: 'user-auth',
					data: { action: 'getShopInfo', data: { shopId: userInfo.shop_id } }
				});
				if (res.result.code === 0 && res.result.data) {
					this.shopName = res.result.data.shop_name || '';
				}
			} catch (e) {}
		},

		scanCode() {
			// #ifdef H5
			uni.showModal({
				title: '输入条码',
				content: 'H5 环境不支持扫码，请手动输入商品条码',
				editable: true,
				placeholderText: '请输入商品条码',
				success: (res) => {
					if (res.confirm && res.content) {
						this.queryByBarcode(res.content.trim());
					}
				}
			});
			// #endif

			// #ifndef H5
			uni.scanCode({
				scanType: ['barCode'],
				onlyFromCamera: true,
				autoDecodeCharSet: true,
				success: (res) => {
					uni.vibrateShort();
					const code = res.result.trim();
					uni.showModal({
						title: '扫码结果',
						content: '识别到的条码：' + code,
						editable: true,
						placeholderText: code,
						success: (modalRes) => {
							const finalCode = (modalRes.content && modalRes.content.trim()) || code;
							this.queryByBarcode(finalCode);
						}
					});
				},
				fail: () => {
					uni.showToast({ title: '扫码失败', icon: 'none' });
				}
			});
			// #endif
		},

		async queryByBarcode(barcode) {
			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.showToast({ title: '用户信息不完整', icon: 'none' });
					return;
				}
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'queryByBarcode',
						barcode: barcode,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				if (res.result.code === 0 && res.result.data.length > 0) {
					this.scannedGoods = res.result.data[0];
				} else {
					uni.showToast({ title: '未找到该商品', icon: 'none' });
				}
			} catch (err) {
				console.error('查询失败:', err);
				uni.showToast({ title: '查询失败', icon: 'none' });
			}
		},

		async handleSearch() {
			if (!this.searchKeyword.trim()) return;
			await this.queryByBarcode(this.searchKeyword.trim());
		},

		clearSearch() {
			this.searchKeyword = '';
			this.scannedGoods = null;
		},

		formatPrice(price) {
			return parseFloat(price || 0).toFixed(2);
		},

		calculateProfit(goods) {
			return (parseFloat(goods.selling_price || 0) - parseFloat(goods.purchase_price || 0)).toFixed(2);
		},

		goCheckout() {
			uni.switchTab({ url: '/pages/checkout/checkout' });
		},

		goAdd() {
			uni.switchTab({ url: '/pages/add/add' });
		}
	}
};
</script>

<style lang="scss">
/* ===== 全局变量（uni.scss 自动注入） ===== */
.page {
	min-height: 100vh;
	background: $app-bg;
	padding: 0 $spacing-md;
	padding-bottom: 180rpx;
}

/* ===== 状态栏 ===== */
.status-bar {
	width: 100%;
}

/* ===== 欢迎卡片 ===== */
.welcome-card {
	@include card-base;
	@include flex-between;
	background: linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(99, 102, 241, 0.02));
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border: 1px solid rgba(79, 70, 229, 0.08);
	padding: $spacing-lg;
	margin-top: $spacing-sm;
}

.welcome-left {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, $app-primary, $app-primary-light);
	@include flex-center;
	flex-shrink: 0;
}

.avatar-text {
	font-size: 32rpx;
	font-weight: $font-weight-bold;
	color: $app-text-inverse;
}

.welcome-info {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.greeting {
	font-size: $font-size-sm;
	color: $app-text-secondary;
}

.welcome-name {
	font-size: $font-size-lg;
	font-weight: $font-weight-bold;
	color: $app-text-primary;
}

/* 门店胶囊 */
.shop-capsule {
	display: flex;
	align-items: center;
	gap: 6rpx;
	background: $app-primary-bg;
	border-radius: 40rpx;
	padding: 12rpx 22rpx;
	flex-shrink: 0;
}

.shop-name {
	font-size: $font-size-sm;
	color: $app-primary;
	font-weight: $font-weight-medium;
}

/* ===== 搜索栏 ===== */
.search-section {
	margin-top: $spacing-lg;
}

.search-box {
	display: flex;
	align-items: center;
	background: $app-bg-card;
	border-radius: 60rpx;
	padding: 0 32rpx;
	height: 88rpx;
	box-shadow: $card-shadow-light;
	gap: 16rpx;
}

.search-input {
	flex: 1;
	height: 88rpx;
	font-size: $font-size-base;
	color: $app-text-primary;
}

.search-clear {
	@include flex-center;
	flex-shrink: 0;
}

/* ===== 功能卡片区 ===== */
.feature-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: $spacing-sm;
	margin-top: $spacing-lg;
}

.feature-card {
	@include card-base;
	padding: 36rpx 20rpx 28rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	transition: transform 0.2s, box-shadow 0.2s;

	&:active {
		transform: scale(0.96);
	}
}

.feature-icon-wrap {
	width: 96rpx;
	height: 96rpx;
	border-radius: 28rpx;
	@include flex-center;
}

.icon-scan-bg {
	background: rgba(79, 70, 229, 0.08);
}

.icon-checkout-bg {
	background: rgba(239, 68, 68, 0.08);
}

.icon-add-bg {
	background: rgba(16, 185, 129, 0.08);
}

.feature-label {
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
	color: $app-text-primary;
}

.feature-desc {
	font-size: $font-size-xs;
	color: $app-text-tertiary;
}

/* ===== 结果卡片 ===== */
.result-section {
	margin-top: $spacing-lg;
}

.result-card {
	@include card-base;
	padding: $spacing-lg;
}

.result-header {
	@include flex-between;
	margin-bottom: $spacing-md;
}

.result-name {
	font-size: $font-size-lg;
	font-weight: $font-weight-bold;
	color: $app-text-primary;
}

.result-badge {
	background: $app-primary-bg;
	border-radius: 12rpx;
	padding: 6rpx 16rpx;

	text {
		font-size: $font-size-xs;
		color: $app-primary;
		font-weight: $font-weight-medium;
	}
}

.result-prices {
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: $app-bg;
	border-radius: $card-radius-sm;
	padding: 24rpx 20rpx;
	margin-bottom: $spacing-sm;
}

.price-item {
	text-align: center;
}

.price-label {
	display: block;
	font-size: $font-size-xs;
	color: $app-text-secondary;
	margin-bottom: 6rpx;
}

.price-value {
	display: block;
	font-size: $font-size-md;
	font-weight: $font-weight-bold;
	color: $app-text-primary;
}

.price-selling {
	color: $app-accent;
}

.price-profit {
	color: $app-danger;
}

.price-divider {
	width: 2rpx;
	height: 48rpx;
	background: $app-border;
}

.result-barcode {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.barcode-label {
	font-size: $font-size-sm;
	color: $app-text-secondary;
}

.barcode-value {
	font-size: $font-size-sm;
	color: $app-text-primary;
	font-family: monospace;
}

/* ===== 空状态 ===== */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
}

.empty-icon-circle {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: $app-primary-bg;
	@include flex-center;
	margin-bottom: $spacing-lg;
}

.empty-title {
	font-size: $font-size-md;
	font-weight: $font-weight-bold;
	color: $app-text-primary;
	margin-bottom: $spacing-xs;
}

.empty-sub {
	font-size: $font-size-sm;
	color: $app-text-tertiary;
}
</style>
