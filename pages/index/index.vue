<template>
	<view class="content">
		<!-- 顶部欢迎区 -->
		<view class="welcome-header">
			<view class="welcome-text">
				<text class="greeting">{{ greetingText }}</text>
				<text class="username">{{ (userInfo && userInfo.username) || '用户' }}</text>
			</view>
			<view class="shop-badge" v-if="userInfo && userInfo.shop_id">
				<view class="badge-dot"></view>
				<text class="badge-text">{{ shopName || '我的店铺' }}</text>
			</view>
		</view>

		<!-- 搜索栏 -->
		<view class="search-bar">
			<view class="search-input-wrap">
				<uni-icons type="search" size="18" color="#b0b0b0"></uni-icons>
				<input type="text" v-model="searchKeyword" placeholder="搜索商品名称或条码" class="search-input" @confirm="handleSearch" confirm-type="search" cursor-spacing="20" />
				<view class="clear-btn" v-if="searchKeyword" @click="clearSearch">
					<uni-icons type="clear" size="18" color="#b0b0b0"></uni-icons>
				</view>
			</view>
		</view>

		<!-- 快捷操作 -->
		<view class="action-grid">
			<view class="action-item" @click="scanCode">
				<view class="action-icon-wrap action-icon-scan">
					<uni-icons type="scan" size="24" color="#ffffff"></uni-icons>
				</view>
				<text class="action-name">扫码查价</text>
			</view>
			<view class="action-item" @click="goCheckout">
				<view class="action-icon-wrap action-icon-checkout">
					<uni-icons type="cart" size="24" color="#ffffff"></uni-icons>
				</view>
				<text class="action-name">扫码结账</text>
			</view>
			<view class="action-item" @click="goAdd">
				<view class="action-icon-wrap action-icon-add">
					<uni-icons type="plusempty" size="24" color="#ffffff"></uni-icons>
				</view>
				<text class="action-name">新增商品</text>
			</view>
		</view>

		<!-- 扫码/搜索结果 -->
		<view class="result-section" v-if="scannedGoods">
			<view class="result-card">
				<view class="result-header">
					<text class="result-name">{{ scannedGoods.name }}</text>
					<view class="result-badge">查询结果</view>
				</view>
				<view class="result-prices">
					<view class="result-price-item">
						<text class="rp-label">进价</text>
						<text class="rp-value">¥{{ formatPrice(scannedGoods.purchase_price) }}</text>
					</view>
					<view class="result-divider"></view>
					<view class="result-price-item">
						<text class="rp-label">售价</text>
						<text class="rp-value selling">¥{{ formatPrice(scannedGoods.selling_price) }}</text>
					</view>
					<view class="result-divider"></view>
					<view class="result-price-item">
						<text class="rp-label">利润</text>
						<text class="rp-value profit">¥{{ calculateProfit(scannedGoods) }}</text>
					</view>
				</view>
				<view class="result-barcode">
					<text class="rb-label">条码</text>
					<text class="rb-value">{{ scannedGoods.barcode }}</text>
				</view>
			</view>
		</view>

		<!-- 空状态提示 -->
		<view class="empty-tip" v-if="!scannedGoods && !searchKeyword">
			<view class="tip-illustration">
				<uni-icons type="scan" size="32" color="#667eea"></uni-icons>
			</view>
			<text class="tip-text">扫描商品条码快速查询价格</text>
			<text class="tip-sub">扫码查价 / 扫码结账 / 添加新商品</text>
		</view>

		<!-- 自定义TabBar -->
		<tab-bar :currentIndex="0"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			scannedGoods: null,
			searchKeyword: '',
			userInfo: null,
			shopName: ''
		};
	},
	computed: {
		greetingText() {
			const hour = new Date().getHours();
			if (hour < 6) return '夜深了';
			if (hour < 12) return '早上好';
			if (hour < 14) return '中午好';
			if (hour < 18) return '下午好';
			return '晚上好';
		}
	},
	onLoad() {
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
							if (modalRes.confirm) {
								const finalCode = (modalRes.content && modalRes.content.trim()) || code;
								this.queryByBarcode(finalCode);
							}
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

<style>
.content {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 30rpx;
	padding-bottom: 160rpx;
}

/* ===== 欢迎区 ===== */
.welcome-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
	padding: 0 10rpx;
}

.greeting {
	display: block;
	font-size: 26rpx;
	color: #999;
	margin-bottom: 8rpx;
}

.username {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: #1a1a2e;
}

.shop-badge {
	display: flex;
	align-items: center;
	gap: 10rpx;
	background: #ffffff;
	padding: 14rpx 24rpx;
	border-radius: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.badge-dot {
	width: 14rpx;
	height: 14rpx;
	background: #667eea;
	border-radius: 50%;
}

.badge-text {
	font-size: 26rpx;
	color: #333;
	font-weight: 500;
}

/* ===== 搜索栏 ===== */
.search-bar {
	margin-bottom: 30rpx;
}

.search-input-wrap {
	display: flex;
	align-items: center;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 0 30rpx;
	height: 88rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
	gap: 16rpx;
}

.search-input {
	flex: 1;
	height: 88rpx;
	font-size: 28rpx;
	color: #333;
}

.clear-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

/* ===== 快捷操作 ===== */
.action-grid {
	display: flex;
	gap: 20rpx;
	margin-bottom: 30rpx;
}

.action-item {
	flex: 1;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 30rpx 20rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.15s;
}

.action-item:active {
	transform: scale(0.96);
}

.action-icon-wrap {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 16rpx;
}

.action-icon-scan {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.action-icon-checkout {
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

.action-icon-add {
	background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.action-name {
	font-size: 26rpx;
	color: #333;
	font-weight: 500;
}

/* ===== 结果卡片 ===== */
.result-section {
	margin-bottom: 30rpx;
}

.result-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.result-name {
	font-size: 36rpx;
	font-weight: bold;
	color: #1a1a2e;
}

.result-badge {
	font-size: 22rpx;
	color: #667eea;
	background: #eef0ff;
	padding: 6rpx 16rpx;
	border-radius: 12rpx;
	font-weight: 500;
}

.result-prices {
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #f8f9fc;
	border-radius: 16rpx;
	padding: 24rpx 20rpx;
	margin-bottom: 20rpx;
}

.result-price-item {
	text-align: center;
}

.rp-label {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-bottom: 8rpx;
}

.rp-value {
	display: block;
	font-size: 32rpx;
	font-weight: bold;
	color: #666;
}

.rp-value.selling {
	color: #11998e;
}

.rp-value.profit {
	color: #ff6b6b;
}

.result-divider {
	width: 2rpx;
	height: 50rpx;
	background: #e8e8e8;
}

.result-barcode {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.rb-label {
	font-size: 24rpx;
	color: #999;
}

.rb-value {
	font-size: 24rpx;
	color: #666;
	font-family: monospace;
}

/* ===== 空状态 ===== */
.empty-tip {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80rpx 40rpx;
}

.tip-illustration {
	width: 120rpx;
	height: 120rpx;
	background: #eef0ff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 30rpx;
}

.tip-text {
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
	margin-bottom: 12rpx;
}

.tip-sub {
	font-size: 24rpx;
	color: #b0b0b0;
}
</style>
