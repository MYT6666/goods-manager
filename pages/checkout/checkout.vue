<template>
	<view class="page">
		<!-- ===== 状态栏占位 ===== -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 极简标题 ===== -->
		<view class="page-header">
			<text class="page-title">扫码结账</text>
			<text class="page-sub">扫描商品条码添加到购物车</text>
		</view>

		<!-- ===== 操作卡片：扫描 + 输入 ===== -->
		<view class="action-card">
			<button class="scan-btn" @click="scanCode">
				<uni-icons type="scan" size="22" color="#4F46E5"></uni-icons>
				<text class="scan-text">扫描条码</text>
			</button>
			<view class="manual-input">
				<input
					type="text"
					v-model="manualKeyword"
					placeholder="输入条码或商品名称"
					class="barcode-input"
					@confirm="searchAndAdd"
					confirm-type="search"
					cursor-spacing="20"
				/>
				<button class="search-btn" @click="searchAndAdd">
					<uni-icons type="search" size="16" color="#FFFFFF"></uni-icons>
					<text>搜索</text>
				</button>
			</view>
		</view>

		<!-- ===== 搜索结果 ===== -->
		<view class="card-section" v-if="searchResults.length > 0">
			<view class="card-section-head">
				<text class="card-section-title">搜索结果</text>
				<text class="card-section-badge">{{ searchResults.length }}个</text>
			</view>
			<view class="search-list">
				<view
					class="search-item"
					v-for="(item, index) in searchResults"
					:key="index"
					@click="selectSearchItem(item)"
				>
					<view class="search-item-info">
						<text class="search-item-name">{{ item.name }}</text>
						<text class="search-item-barcode">{{ item.barcode }}</text>
					</view>
					<view class="search-item-right">
						<text class="search-item-price">¥{{ parseFloat(item.selling_price).toFixed(2) }}</text>
						<uni-icons type="plus-filled" size="22" color="#4F46E5"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- ===== 购物车 ===== -->
		<view class="card-section" v-if="cartItems.length > 0">
			<view class="card-section-head">
				<view class="cart-title-row">
					<uni-icons type="cart" size="18" color="#4F46E5"></uni-icons>
					<text class="card-section-title">购物车</text>
				</view>
				<text class="card-section-badge">{{ totalItems }}件</text>
			</view>
			<view class="cart-list">
				<view class="cart-item" v-for="(item, index) in cartItems" :key="index">
					<view class="cart-item-info">
						<text class="cart-item-name">{{ item.name }}</text>
						<text class="cart-item-barcode">{{ item.barcode }}</text>
					</view>
					<view class="cart-item-right">
						<view class="qty-ctrl">
							<view class="qty-btn" @click="changeQuantity(index, -1)">
								<uni-icons type="minus" size="12" color="#EF4444"></uni-icons>
							</view>
							<text class="qty-val">{{ item.quantity }}</text>
							<view class="qty-btn" @click="changeQuantity(index, 1)">
								<uni-icons type="plus" size="12" color="#4F46E5"></uni-icons>
							</view>
						</view>
						<text class="cart-item-subtotal">¥{{ (item.selling_price * item.quantity).toFixed(2) }}</text>
						<view class="remove-btn" @click="removeItem(index)">
							<uni-icons type="closeempty" size="16" color="#FCA5A5"></uni-icons>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- ===== 空购物车 ===== -->
		<view class="empty-cart" v-else>
			<view class="empty-icon-wrap">
				<uni-icons type="cart" size="48" color="#9CA3AF"></uni-icons>
			</view>
			<text class="empty-title">购物车为空</text>
			<text class="empty-hint">扫描商品条码开始结账</text>
		</view>

		<!-- ===== 结算栏 ===== -->
		<view class="checkout-bar" v-if="cartItems.length > 0">
			<view class="bar-clear" @click="clearCart">
				<uni-icons type="trash" size="18" color="#9CA3AF"></uni-icons>
				<text class="clear-text">清空</text>
			</view>
			<view class="bar-total">
				<text class="total-label">合计</text>
				<text class="total-amount">¥{{ totalAmount }}</text>
			</view>
			<view class="bar-pay" @click="checkout">
				<text class="pay-text">结账({{ totalItems }})</text>
			</view>
		</view>

		<!-- ===== 底部导航 ===== -->
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
						this.addToCart(res.result.data[0]);
						this.searchResults = [];
						this.manualKeyword = '';
					} else {
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

		selectSearchItem(goods) {
			this.addToCart(goods);
			this.searchResults = [];
			this.manualKeyword = '';
		},

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

		changeQuantity(index, delta) {
			const item = this.cartItems[index];
			const newQty = item.quantity + delta;
			if (newQty <= 0) {
				this.removeItem(index);
				return;
			}
			this.$set(this.cartItems[index], 'quantity', newQty);
		},

		removeItem(index) {
			this.cartItems.splice(index, 1);
		},

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

		checkout() {
			if (this.cartItems.length === 0) return;
			const items = this.cartItems.map(item => item.name + ' x' + item.quantity).join('\n');
			uni.showModal({
				title: '确认结账',
				content: items + '\n\n合计：¥' + this.totalAmount,
				confirmColor: '#10B981',
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

<style lang="scss">
/* ============================================================
   1. 页面基底
   ============================================================ */
.page {
	min-height: 100vh;
	background: #FAFAFA;
	padding: 0 24rpx;
	padding-bottom: calc(360rpx + env(safe-area-inset-bottom));
}

.status-bar {
	width: 100%;
}

/* ============================================================
   2. 极简标题
   ============================================================ */
.page-header {
	padding: 20rpx 8rpx 24rpx;
}

.page-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 8rpx;
}

.page-sub {
	display: block;
	font-size: 26rpx;
	color: #9CA3AF;
}

/* ============================================================
   3. 操作卡片
   ============================================================ */
.action-card {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 28rpx;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.02);
	margin-bottom: 16rpx;
}

.scan-btn {
	width: 100%;
	height: 96rpx;
	background: rgba(79, 70, 229, 0.06);
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	padding: 0;
	margin: 0 0 20rpx 0;
	border: none;
}

.scan-text {
	font-size: 30rpx;
	font-weight: 600;
	color: #4F46E5;
}

.manual-input {
	display: flex;
	gap: 14rpx;
}

.barcode-input {
	flex: 1;
	height: 80rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding: 0 22rpx;
	font-size: 26rpx;
	color: #1F2937;
	border: 1px solid #F3F4F6;
}

.search-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	width: 130rpx;
	height: 80rpx;
	background: #4F46E5;
	color: #FFFFFF;
	font-size: 26rpx;
	font-weight: 500;
	border-radius: 12rpx;
	padding: 0;
	margin: 0;
	border: none;
}

/* ============================================================
   4. 通用卡片区域
   ============================================================ */
.card-section {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 28rpx;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.02);
	margin-bottom: 16rpx;
}

.card-section-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	padding-bottom: 18rpx;
	border-bottom: 1px solid #F3F4F6;
}

.cart-title-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.card-section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1F2937;
}

.card-section-badge {
	font-size: 22rpx;
	color: #4F46E5;
	background: rgba(79, 70, 229, 0.06);
	padding: 4rpx 14rpx;
	border-radius: 16rpx;
}

/* ============================================================
   5. 搜索结果列表
   ============================================================ */
.search-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.search-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18rpx 20rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
}

.search-item-info {
	flex: 1;
	min-width: 0;
}

.search-item-name {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #1F2937;
	margin-bottom: 4rpx;
}

.search-item-barcode {
	display: block;
	font-size: 22rpx;
	color: #9CA3AF;
	font-family: monospace;
}

.search-item-right {
	display: flex;
	align-items: center;
	gap: 14rpx;
	flex-shrink: 0;
}

.search-item-price {
	font-size: 28rpx;
	font-weight: 700;
	color: #4F46E5;
}

/* ============================================================
   6. 购物车列表
   ============================================================ */
.cart-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.cart-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18rpx 20rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
}

.cart-item-info {
	flex: 1;
	min-width: 0;
	margin-right: 16rpx;
}

.cart-item-name {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #1F2937;
	margin-bottom: 4rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cart-item-barcode {
	display: block;
	font-size: 22rpx;
	color: #9CA3AF;
	font-family: monospace;
}

.cart-item-right {
	display: flex;
	align-items: center;
	gap: 16rpx;
	flex-shrink: 0;
}

.qty-ctrl {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.qty-btn {
	width: 52rpx;
	height: 52rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #FFFFFF;
	border: 1px solid #E5E7EB;
}

.qty-val {
	font-size: 28rpx;
	font-weight: 700;
	color: #1F2937;
	min-width: 36rpx;
	text-align: center;
}

.cart-item-subtotal {
	font-size: 28rpx;
	font-weight: 700;
	color: #4F46E5;
	min-width: 110rpx;
	text-align: right;
}

.remove-btn {
	width: 52rpx;
	height: 52rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	padding: 0;
	margin: 0;
}

/* ============================================================
   7. 空购物车
   ============================================================ */
.empty-cart {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 100rpx 40rpx;
}

.empty-icon-wrap {
	width: 130rpx;
	height: 130rpx;
	border-radius: 50%;
	background: #F3F4F6;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 24rpx;
}

.empty-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #1F2937;
	margin-bottom: 10rpx;
}

.empty-hint {
	font-size: 24rpx;
	color: #9CA3AF;
}

/* ============================================================
   8. 结算栏
   ============================================================ */
.checkout-bar {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(126rpx + env(safe-area-inset-bottom));
	height: 100rpx;
	background: #FFFFFF;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
	z-index: 100;
	overflow: hidden;
}

.bar-clear {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 0 24rpx;
	height: 100%;
}

.clear-text {
	font-size: 24rpx;
	color: #9CA3AF;
}

.bar-total {
	flex: 1;
	display: flex;
	align-items: baseline;
	justify-content: flex-end;
	padding-right: 20rpx;
	gap: 6rpx;
}

.total-label {
	font-size: 24rpx;
	color: #6B7280;
}

.total-amount {
	font-size: 36rpx;
	font-weight: 700;
	color: #EF4444;
}

.bar-pay {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 36rpx;
	background: #4F46E5;
}

.pay-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #FFFFFF;
}
</style>
