<template>
	<view class="content">
		<!-- 页面标题区 -->
		<view class="page-header">
			<view class="header-title">
				<text class="title-text">商品列表</text>
				<text class="title-count" v-if="goodsList.length > 0">{{ goodsList.length }}件商品</text>
			</view>
			<view class="header-stats" v-if="goodsList.length > 0">
				<view class="stat-item">
					<text class="stat-value">{{ totalPurchase }}</text>
					<text class="stat-label">总进价</text>
				</view>
				<view class="stat-item">
					<text class="stat-value">{{ totalSelling }}</text>
					<text class="stat-label">总售价</text>
				</view>
				<view class="stat-item">
					<text class="stat-value profit">{{ totalProfit }}</text>
					<text class="stat-label">总利润</text>
				</view>
			</view>
		</view>

		<!-- 商品列表 -->
		<view class="goods-list" v-if="goodsList.length > 0">
			<view
				v-for="(goods, index) in goodsList"
				:key="goods.id"
				class="goods-card"
				@click="openGoodsDetail(goods)"
			>
				<view class="card-main">
					<view class="goods-header">
						<text class="goods-name">{{ goods.name }}</text>
						<text class="goods-barcode">{{ goods.barcode }}</text>
					</view>
					<view class="goods-prices">
						<view class="price-tag purchase">
							<text class="tag-label">进</text>
							<text class="tag-value">¥{{ goods.purchase_price }}</text>
						</view>
						<view class="price-tag selling">
							<text class="tag-label">售</text>
							<text class="tag-value">¥{{ goods.selling_price }}</text>
						</view>
						<view class="price-tag profit">
							<text class="tag-label">利</text>
							<text class="tag-value">¥{{ calculateProfit(goods) }}</text>
						</view>
					</view>
				</view>
				<view class="card-actions" v-if="hasDeletePermission">
					<button class="action-btn delete" @click.stop="showDeleteConfirm(goods)">
						<text class="btn-icon">🗑️</text>
					</button>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<view class="empty-icon">
				<text class="icon-text">📦</text>
			</view>
			<text class="empty-title">暂无商品</text>
			<text class="empty-desc">点击首页"新增商品"开始添加</text>
			<button class="empty-btn" @click="goToHome">去添加商品</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			goodsList: [],
			userInfo: null
		};
	},
	computed: {
		hasDeletePermission() {
			return (this.userInfo && (this.userInfo.role === 'store_manager' || this.userInfo.role === 'manager'));
		},
		totalPurchase() {
			const total = this.goodsList.reduce((sum, g) => sum + parseFloat(g.purchase_price || 0), 0);
			return '¥' + total.toFixed(2);
		},
		totalSelling() {
			const total = this.goodsList.reduce((sum, g) => sum + parseFloat(g.selling_price || 0), 0);
			return '¥' + total.toFixed(2);
		},
		totalProfit() {
			const total = this.goodsList.reduce((sum, g) => {
				return sum + (parseFloat(g.selling_price || 0) - parseFloat(g.purchase_price || 0));
			}, 0);
			return '¥' + total.toFixed(2);
		}
	},
	onLoad() {
		this.userInfo = uni.getStorageSync('userInfo');
		this.loadGoodsList();
	},
	onShow() {
		this.userInfo = uni.getStorageSync('userInfo');
		this.loadGoodsList();
	},
	methods: {
		calculateProfit(goods) {
			return (parseFloat(goods.selling_price || 0) - parseFloat(goods.purchase_price || 0)).toFixed(2);
		},
		async loadGoodsList() {
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
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0) {
					this.goodsList = res.result.data || [];
				}
			} catch {
				uni.showToast({ title: '加载失败', icon: 'none' });
			}
		},
		showDeleteConfirm(goods) {
			uni.showModal({
				title: '确认删除',
				content: `确定要删除 "${goods.name}" 吗？`,
				confirmColor: '#ff6b6b',
				success: (res) => {
					if (res.confirm) {
						this.deleteGoods(goods.id);
					}
				}
			});
		},
		async deleteGoods(goodsId) {
			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');

				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'delete',
						id: goodsId,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0) {
					uni.showToast({ title: '删除成功', icon: 'success' });
					this.loadGoodsList();
				}
			} catch {
				uni.showToast({ title: '删除失败', icon: 'none' });
			}
		},
		openGoodsDetail(goods) {
			const profit = this.calculateProfit(goods);
			uni.showModal({
				title: '商品详情',
				content: `名称：${goods.name}\n进价：¥${goods.purchase_price}\n卖价：¥${goods.selling_price}\n利润：¥${profit}\n条码：${goods.barcode}\n备注：${goods.remark || '无'}`,
				showCancel: false
			});
		},
		goToHome() {
			uni.switchTab({ url: '/pages/index/index' });
		}
	}
};
</script>

<style>
.content {
	min-height: 100vh;
	background: linear-gradient(180deg, #f0f4f8 0%, #ffffff 100%);
	padding: 30rpx;
}

/* 页面标题区 */
.page-header {
	background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
	border-radius: 24rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 10rpx 40rpx rgba(17, 153, 142, 0.3);
}

.header-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
}

.title-text {
	font-size: 40rpx;
	font-weight: bold;
	color: #ffffff;
}

.title-count {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.9);
	background: rgba(255, 255, 255, 0.2);
	padding: 8rpx 20rpx;
	border-radius: 20rpx;
}

.header-stats {
	display: flex;
	justify-content: space-around;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 16rpx;
	padding: 25rpx;
}

.stat-item {
	text-align: center;
}

.stat-value {
	display: block;
	font-size: 32rpx;
	font-weight: bold;
	color: #ffffff;
	margin-bottom: 8rpx;
}

.stat-value.profit {
	color: #ffeb3b;
}

.stat-label {
	display: block;
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.8);
}

/* 商品列表 */
.goods-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.goods-card {
	display: flex;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	transition: transform 0.2s;
}

.goods-card:active {
	transform: scale(0.98);
}

.card-main {
	flex: 1;
}

.goods-header {
	margin-bottom: 20rpx;
}

.goods-name {
	display: block;
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
}

.goods-barcode {
	display: block;
	font-size: 24rpx;
	color: #999;
	font-family: monospace;
}

.goods-prices {
	display: flex;
	gap: 15rpx;
}

.price-tag {
	display: flex;
	align-items: center;
	padding: 10rpx 20rpx;
	border-radius: 10rpx;
	gap: 10rpx;
}

.price-tag.purchase {
	background: #e3f2fd;
}

.price-tag.selling {
	background: #e8f5e9;
}

.price-tag.profit {
	background: #ffebee;
}

.tag-label {
	font-size: 22rpx;
	font-weight: bold;
	padding: 4rpx 10rpx;
	border-radius: 6rpx;
}

.price-tag.purchase .tag-label {
	background: #2196f3;
	color: #fff;
}

.price-tag.selling .tag-label {
	background: #4caf50;
	color: #fff;
}

.price-tag.profit .tag-label {
	background: #f44336;
	color: #fff;
}

.tag-value {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.card-actions {
	display: flex;
	align-items: center;
	margin-left: 20rpx;
}

.action-btn {
	width: 80rpx;
	height: 80rpx;
	padding: 0;
	margin: 0;
	background: #ffebee;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.action-btn.delete {
	background: #ffebee;
}

.btn-icon {
	font-size: 36rpx;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 40rpx;
}

.empty-icon {
	width: 200rpx;
	height: 200rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 40rpx;
	box-shadow: 0 10rpx 40rpx rgba(102, 126, 234, 0.3);
}

.icon-text {
	font-size: 100rpx;
}

.empty-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 15rpx;
}

.empty-desc {
	font-size: 28rpx;
	color: #999;
	margin-bottom: 40rpx;
}

.empty-btn {
	width: 300rpx;
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 500;
	border-radius: 45rpx;
	box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
}
</style>
