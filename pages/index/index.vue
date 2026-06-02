<template>
	<view class="page">
		<!-- ===== 顶部柔和渐变背景 ===== -->
		<view class="top-gradient"></view>

		<!-- ===== 状态栏占位 ===== -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 欢迎区 ===== -->
		<view class="welcome-section">
			<view class="avatar">
				<text class="avatar-text">{{ avatarChar }}</text>
			</view>
			<view class="welcome-body">
				<view class="welcome-top-row">
					<text class="greeting">{{ greetingText }}</text>
					<view class="shop-capsule" v-if="userInfo && userInfo.shop_id">
						<view class="capsule-dot"></view>
						<text class="shop-name">{{ shopName || 'YT厂库' }}</text>
					</view>
				</view>
				<text class="welcome-name">{{ userInfo.username || 'boss1' }}，{{ timePeriod }}好</text>
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

		<!-- ===== 功能卡片区 ===== -->
		<view class="feature-grid">
			<!-- 扫码查价 · 淡蓝 -->
			<view class="feature-card card-scan" @click="scanCode">
				<view class="feature-icon-wrap">
					<uni-icons type="scan" size="34" color="#00A8B5"></uni-icons>
				</view>
				<text class="feature-label">扫码查价</text>
				<text class="feature-desc">扫描条码查价格</text>
			</view>

			<!-- 扫码结账 · 淡红 -->
			<view class="feature-card card-checkout" @click="goCheckout">
				<view class="feature-icon-wrap">
					<uni-icons type="cart" size="34" color="#EF4444"></uni-icons>
				</view>
				<text class="feature-label">扫码结账</text>
				<text class="feature-desc">快速结算订单</text>
			</view>

			<!-- 新增商品 · 淡绿 -->
			<view class="feature-card card-add" @click="goAdd">
				<view class="feature-icon-wrap">
					<uni-icons type="plusempty" size="34" color="#10B981"></uni-icons>
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
				<uni-icons type="scan" size="40" color="#00A8B5"></uni-icons>
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
			const keyword = this.searchKeyword.trim();
			if (!keyword) return;
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
						action: 'search',
						keyword: keyword,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				if (res.result.code === 0 && res.result.data && res.result.data.length > 0) {
					this.scannedGoods = res.result.data[0];
				} else {
					uni.showToast({ title: '未找到相关商品', icon: 'none' });
				}
			} catch (err) {
				console.error('搜索失败:', err);
				uni.showToast({ title: '搜索失败', icon: 'none' });
			}
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
/* ============================================================
   1. 页面基底
   ============================================================ */
.page {
	min-height: 100vh;
	background: #FAFAFA;
	padding: 0 $spacing-md;
	padding-bottom: 180rpx;
	position: relative;
}

/* 顶部柔和渐变（淡蓝 → 白 → 透明） */
.top-gradient {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 360rpx;
	background: linear-gradient(180deg,
		rgba(0, 168, 181, 0.04) 0%,
		rgba(99, 102, 241, 0.02) 30%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
	z-index: 0;
}

.status-bar {
	width: 100%;
	position: relative;
	z-index: 1;
}

/* ============================================================
   2. 欢迎区
   ============================================================ */
.welcome-section {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: $spacing-sm 0 $spacing-md;
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #00A8B5, #007BFF);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-shadow: 0 4rpx 16rpx rgba(0, 168, 181, 0.18);
}

.avatar-text {
	font-size: 36rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.welcome-body {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

/* 问好行：问候语 + 门店胶囊 */
.welcome-top-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.greeting {
	font-size: 26rpx;
	color: #6B7280;
}

/* 门店胶囊：半透明 + 微弱灰边框 */
.shop-capsule {
	display: flex;
	align-items: center;
	gap: 8rpx;
	background: rgba(255, 255, 255, 0.7);
	border: 1px solid rgba(0, 0, 0, 0.06);
	border-radius: 32rpx;
	padding: 6rpx 18rpx;
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);
}

.capsule-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #00A8B5;
}

.shop-name {
	font-size: 22rpx;
	color: #00A8B5;
	font-weight: 500;
}

/* 用户名：加粗放大 */
.welcome-name {
	font-size: 40rpx;
	font-weight: 700;
	color: #1F2937;
	line-height: 1.3;
}

/* ============================================================
   3. 搜索栏 — 两端完全大圆角
   ============================================================ */
.search-section {
	margin-top: $spacing-md;
	position: relative;
	z-index: 1;
}

.search-box {
	display: flex;
	align-items: center;
	background: #FFFFFF;
	border-radius: 50px;
	padding: 0 36rpx;
	height: 92rpx;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
	gap: 16rpx;
}

.search-input {
	flex: 1;
	height: 92rpx;
	font-size: 28rpx;
	color: #1F2937;
}

.search-clear {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

/* ============================================================
   4. 功能卡片区 — 马卡龙淡色背景
   ============================================================ */
.feature-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16rpx;
	margin-top: $spacing-lg;
	position: relative;
	z-index: 1;
}

.feature-card {
	border-radius: 16px;
	padding: 36rpx 16rpx 28rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	transition: transform 0.2s, box-shadow 0.2s;

	&:active {
		transform: scale(0.96);
	}
}

/* 扫码查价 — 淡蓝 */
.card-scan {
	background: rgba(0, 168, 181, 0.06);
}

/* 扫码结账 — 淡红 */
.card-checkout {
	background: rgba(239, 68, 68, 0.06);
}

/* 新增商品 — 淡绿 */
.card-add {
	background: rgba(16, 185, 129, 0.06);
}

.feature-icon-wrap {
	width: 96rpx;
	height: 96rpx;
	border-radius: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.7);
}

.feature-label {
	font-size: 28rpx;
	font-weight: 700;
	color: #1F2937;
}

.feature-desc {
	font-size: 22rpx;
	color: #9CA3AF;
}

/* ============================================================
   5. 扫码结果卡片
   ============================================================ */
.result-section {
	margin-top: $spacing-lg;
	position: relative;
	z-index: 1;
}

.result-card {
	background: #FFFFFF;
	border-radius: 20px;
	padding: $spacing-lg;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.result-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: $spacing-md;
}

.result-name {
	font-size: 36rpx;
	font-weight: 700;
	color: #1F2937;
}

.result-badge {
	background: rgba(0, 168, 181, 0.08);
	border-radius: 12rpx;
	padding: 6rpx 16rpx;

	text {
		font-size: 22rpx;
		color: #00A8B5;
		font-weight: 500;
	}
}

.result-prices {
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #FAFAFA;
	border-radius: 14px;
	padding: 24rpx 20rpx;
	margin-bottom: $spacing-sm;
}

.price-item {
	text-align: center;
}

.price-label {
	display: block;
	font-size: 22rpx;
	color: #9CA3AF;
	margin-bottom: 6rpx;
}

.price-value {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
}

.price-selling {
	color: #10B981;
}

.price-profit {
	color: #EF4444;
}

.price-divider {
	width: 2rpx;
	height: 48rpx;
	background: #E5E7EB;
}

.result-barcode {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.barcode-label {
	font-size: 24rpx;
	color: #6B7280;
}

.barcode-value {
	font-size: 24rpx;
	color: #1F2937;
	font-family: monospace;
}

/* ============================================================
   6. 空状态
   ============================================================ */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
	position: relative;
	z-index: 1;
}

.empty-icon-circle {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: rgba(0, 168, 181, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: $spacing-lg;
}

.empty-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: $spacing-xs;
}

.empty-sub {
	font-size: 24rpx;
	color: #9CA3AF;
}
</style>
