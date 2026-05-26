<template>
	<view class="content">
		<!-- 顶部扫码区域 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="scan-section">
			<view class="scan-header">
				<text class="scan-title">扫码结账</text>
				<text class="scan-desc">扫描商品条码添加到购物车</text>
			</view>
			<view class="scan-actions">
				<button class="scan-btn" @click="scanCode">
					<uni-icons type="scan" size="24" color="#fff"></uni-icons>
					<text class="scan-text">扫描条码</text>
				</button>
				<view class="manual-input">
					<input type="text" v-model="manualKeyword" placeholder="输入条码或商品名称" class="barcode-input" @confirm="searchAndAdd" confirm-type="search" cursor-spacing="20" />
					<button class="add-btn" @click="searchAndAdd">
						<uni-icons type="search" size="18" color="#fff"></uni-icons>
						<text>搜索</text>
					</button>
				</view>
			</view>
		</view>

		<!-- 搜索结果选择 -->
		<view class="search-result-section" v-if="searchResults.length > 0">
			<view class="search-result-header">
				<text class="search-result-title">搜索结果</text>
				<text class="search-result-count">{{ searchResults.length }}个商品</text>
			</view>
			<view class="search-result-list">
				<view class="search-result-item" v-for="(item, index) in searchResults" :key="index" @click="selectSearchItem(item)">
					<view class="sri-info">
						<text class="sri-name">{{ item.name }}</text>
						<text class="sri-barcode">{{ item.barcode }}</text>
					</view>
					<view class="sri-right">
						<text class="sri-price">¥{{ parseFloat(item.selling_price).toFixed(2) }}</text>
						<uni-icons type="plus-filled" size="22" color="#667eea"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- 购物车列表 -->
		<view class="cart-section" v-if="cartItems.length > 0">
			<view class="cart-header">
				<view class="cart-title-row">
					<uni-icons type="cart" size="20" color="#667eea"></uni-icons>
					<text class="cart-title">购物车</text>
				</view>
				<text class="cart-count">{{ totalItems }}件商品</text>
			</view>

			<view class="cart-list">
				<view class="cart-item" v-for="(item, index) in cartItems" :key="index">
					<view class="item-info">
						<text class="item-name">{{ item.name }}</text>
						<text class="item-barcode">{{ item.barcode }}</text>
					</view>
					<view class="item-right">
						<view class="quantity-control">
							<button class="qty-btn minus" @click="changeQuantity(index, -1)">
								<uni-icons type="minus" size="14" color="#ff6b6b"></uni-icons>
							</button>
							<text class="qty-value">{{ item.quantity }}</text>
							<button class="qty-btn plus" @click="changeQuantity(index, 1)">
								<uni-icons type="plus" size="14" color="#667eea"></uni-icons>
							</button>
						</view>
						<text class="item-subtotal">¥{{ (item.selling_price * item.quantity).toFixed(2) }}</text>
						<button class="remove-btn" @click="removeItem(index)">
							<uni-icons type="closeempty" size="16" color="#ff6b6b"></uni-icons>
						</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 空购物车 -->
		<view class="empty-cart" v-else>
			<uni-icons type="cart" size="64" color="#d0d3e8"></uni-icons>
			<text class="empty-text">购物车为空</text>
			<text class="empty-hint">扫描商品条码开始结账</text>
		</view>

		<!-- 底部结算栏 -->
		<view class="checkout-bar" v-if="cartItems.length > 0">
			<view class="bar-left" @click="clearCart">
				<uni-icons type="trash" size="18" color="#999"></uni-icons>
				<text class="clear-text">清空</text>
			</view>
			<view class="bar-center">
				<text class="total-label">合计：</text>
				<text class="total-amount">¥{{ totalAmount }}</text>
			</view>
			<view class="bar-right" @click="checkout">
				<text class="checkout-text">结账({{ totalItems }})</text>
			</view>
		</view>

		<!-- 自定义TabBar -->
		<tab-bar :currentIndex="3"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			statusBarHeight: 0,
			cartItems: [],
			manualKeyword: '',
			searchResults: []
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
	},
	onShow() {
		uni.hideTabBar({ animation: false });
	},
	computed: {
		totalAmount() {
			return this.cartItems.reduce((sum, item) => {
				return sum + parseFloat(item.selling_price) * item.quantity;
			}, 0).toFixed(2);
		},
		totalItems() {
			return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
		}
	},
	methods: {
		// 扫码
		scanCode() {
			// #ifdef H5
			uni.showModal({
				title: '输入条码',
				content: 'H5 环境不支持扫码，请手动输入商品条码',
				editable: true,
				placeholderText: '请输入商品条码',
				success: (res) => {
					if (res.confirm && res.content) {
						this.queryAndAdd(res.content.trim());
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
								this.queryAndAdd(finalCode);
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

		// 手动搜索商品
		async searchAndAdd() {
			const keyword = this.manualKeyword.trim();
			if (!keyword) {
				uni.showToast({ title: '请输入条码或商品名称', icon: 'none' });
				return;
			}
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

				if (res.result.code === 0 && res.result.data.length > 0) {
					if (res.result.data.length === 1) {
						// 只有一个结果，直接添加
						this.addToCart(res.result.data[0]);
						this.searchResults = [];
						this.manualKeyword = '';
					} else {
						// 多个结果，显示选择列表
						this.searchResults = res.result.data;
					}
				} else {
					uni.showToast({ title: '未找到该商品', icon: 'none' });
					this.searchResults = [];
				}
			} catch (err) {
				console.error('搜索商品失败:', err);
				uni.showToast({ title: '搜索失败', icon: 'none' });
			}
		},

		// 选择搜索结果中的商品
		selectSearchItem(goods) {
			this.addToCart(goods);
			this.searchResults = [];
			this.manualKeyword = '';
		},

		// 根据条码查询商品并添加到购物车
		async queryAndAdd(barcode) {
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
					const goods = res.result.data[0];
					this.addToCart(goods);
				} else {
					uni.showToast({ title: '未找到该商品', icon: 'none' });
				}
			} catch (err) {
				console.error('查询商品失败:', err);
				uni.showToast({ title: '查询失败', icon: 'none' });
			}
		},

		// 添加到购物车
		addToCart(goods) {
			const existIndex = this.cartItems.findIndex(item => item.id === goods.id);
			if (existIndex >= 0) {
				this.cartItems[existIndex].quantity += 1;
			} else {
				this.cartItems.push({
					id: goods.id,
					name: goods.name,
					barcode: goods.barcode,
					selling_price: parseFloat(goods.selling_price),
					purchase_price: parseFloat(goods.purchase_price),
					quantity: 1
				});
			}
			uni.showToast({ title: '已添加', icon: 'success' });
		},

		// 修改数量
		changeQuantity(index, delta) {
			const item = this.cartItems[index];
			const newQty = item.quantity + delta;
			if (newQty <= 0) {
				this.removeItem(index);
				return;
			}
			this.$set(this.cartItems[index], 'quantity', newQty);
		},

		// 移除商品
		removeItem(index) {
			this.cartItems.splice(index, 1);
		},

		// 清空购物车
		clearCart() {
			uni.showModal({
				title: '确认清空',
				content: '确定要清空购物车吗？',
				confirmColor: '#ff6b6b',
				success: (res) => {
					if (res.confirm) {
						this.cartItems = [];
					}
				}
			});
		},

		// 结账
		checkout() {
			if (this.cartItems.length === 0) return;

			const items = this.cartItems.map(item => `${item.name} x${item.quantity}`).join('\n');
			uni.showModal({
				title: '确认结账',
				content: `${items}\n\n合计：¥${this.totalAmount}`,
				confirmColor: '#11998e',
				success: (res) => {
					if (res.confirm) {
						uni.showToast({ title: '结账成功', icon: 'success' });
						this.cartItems = [];
					}
				}
			});
		}
	}
};
</script>

<style>
.content {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 30rpx;
	padding-bottom: calc(420rpx + env(safe-area-inset-bottom));
}

/* 扫码区域 */
.scan-section {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 10rpx 40rpx rgba(102, 126, 234, 0.3);
}

.scan-header {
	margin-bottom: 30rpx;
}

.scan-title {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: #ffffff;
	margin-bottom: 10rpx;
}

.scan-desc {
	display: block;
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.8);
}

.scan-actions {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.scan-btn {
	width: 100%;
	height: 100rpx;
	background: rgba(255, 255, 255, 0.2);
	border: 2rpx solid rgba(255, 255, 255, 0.4);
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 15rpx;
	padding: 0;
	margin: 0;
}

.scan-text {
	font-size: 34rpx;
	font-weight: bold;
	color: #ffffff;
}

.manual-input {
	display: flex;
	gap: 15rpx;
}

.barcode-input {
	flex: 1;
	height: 80rpx;
	background: rgba(255, 255, 255, 0.2);
	border: 2rpx solid rgba(255, 255, 255, 0.3);
	border-radius: 12rpx;
	padding: 0 25rpx;
	font-size: 28rpx;
	color: #ffffff;
}

.add-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	width: 140rpx;
	height: 80rpx;
	background: rgba(255, 255, 255, 0.3);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: bold;
	border-radius: 12rpx;
	padding: 0;
	margin: 0;
	border: none;
}

/* 搜索结果区域 */
.search-result-section {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.search-result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.search-result-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.search-result-count {
	font-size: 24rpx;
	color: #667eea;
	background: #eef0fb;
	padding: 6rpx 16rpx;
	border-radius: 15rpx;
}

.search-result-list {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.search-result-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 24rpx;
	background: #f8f9fc;
	border-radius: 16rpx;
	transition: background 0.15s;
}

.search-result-item:active {
	background: #eef0fb;
}

.sri-info {
	flex: 1;
}

.sri-name {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 6rpx;
}

.sri-barcode {
	display: block;
	font-size: 22rpx;
	color: #999;
	font-family: monospace;
}

.sri-right {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.sri-price {
	font-size: 28rpx;
	font-weight: bold;
	color: #667eea;
}

/* 购物车区域 */
.cart-section {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.cart-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 25rpx;
	padding-bottom: 20rpx;
	border-bottom: 2rpx solid #f0f0f0;
}

.cart-title-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.cart-title {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
}

.cart-count {
	font-size: 24rpx;
	color: #667eea;
	background: #eef0fb;
	padding: 6rpx 16rpx;
	border-radius: 15rpx;
}

.cart-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.cart-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background: #f8f9fc;
	border-radius: 16rpx;
}

.item-info {
	flex: 1;
	margin-right: 20rpx;
}

.item-name {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 6rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 280rpx;
}

.item-barcode {
	display: block;
	font-size: 22rpx;
	color: #999;
	font-family: monospace;
}

.item-right {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.quantity-control {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.qty-btn {
	width: 64rpx;
	height: 64rpx;
	padding: 0;
	margin: 0;
	background: #ffffff;
	border: 2rpx solid #e8e8e8;
	border-radius: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.qty-value {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	min-width: 40rpx;
	text-align: center;
}

.item-subtotal {
	font-size: 30rpx;
	font-weight: bold;
	color: #667eea;
	min-width: 120rpx;
	text-align: right;
}

.remove-btn {
	width: 64rpx;
	height: 64rpx;
	padding: 0;
	margin: 0;
	background: #fff0f0;
	border-radius: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
}

/* 空购物车 */
.empty-cart {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 40rpx;
}

.empty-text {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
	margin-top: 30rpx;
	margin-bottom: 15rpx;
}

.empty-hint {
	font-size: 26rpx;
	color: #999;
}

/* 底部结算栏 - 京东风格 */
.checkout-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: calc(110rpx + env(safe-area-inset-bottom));
	height: 100rpx;
	background: #ffffff;
	display: flex;
	align-items: center;
	box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.08);
	z-index: 100;
}

.bar-left {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 0 30rpx;
	height: 100%;
}

.clear-text {
	font-size: 26rpx;
	color: #999;
}

.bar-center {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding-right: 24rpx;
	gap: 4rpx;
}

.total-label {
	font-size: 26rpx;
	color: #333;
}

.total-amount {
	font-size: 36rpx;
	font-weight: bold;
	color: #ff4757;
}

.bar-right {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 40rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.checkout-text {
	font-size: 30rpx;
	font-weight: bold;
	color: #ffffff;
}
</style>
