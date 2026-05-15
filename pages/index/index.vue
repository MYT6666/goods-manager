<template>
	<view class="content">
		<!-- 欢迎区域 -->
		<view class="welcome-section">
			<view class="welcome-header">
				<text class="greeting">欢迎使用</text>
				<text class="app-name">商品管理系统</text>
			</view>
			<view class="user-brief" v-if="userInfo">
				<text class="welcome-text">你好，{{ userInfo.username }}</text>
				<text class="role-badge" :class="userInfo.role">{{ roleText }}</text>
			</view>
		</view>

		<!-- 快捷操作区 -->
		<view class="quick-actions">
			<view class="action-title">快捷操作</view>
			<view class="action-grid">
				<view class="action-item scan" @click="scanCode">
					<view class="action-icon">
						<text class="iconfont">📷</text>
					</view>
					<text class="action-name">扫码查价</text>
					<text class="action-desc">扫描商品条码</text>
				</view>
				<view class="action-item add" @click="showAddForm">
					<view class="action-icon">
						<text class="iconfont">➕</text>
					</view>
					<text class="action-name">新增商品</text>
					<text class="action-desc">添加新商品</text>
				</view>
			</view>
		</view>

		<!-- 搜索区域 -->
		<view class="search-section">
			<view class="search-box">
				<text class="search-icon">🔍</text>
				<input 
					type="text" 
					v-model="searchKeyword" 
					placeholder="搜索商品名称或条码..." 
					class="search-input" 
					@confirm="handleSearch"
				/>
				<button v-if="searchKeyword" class="clear-btn" @click="clearSearch">✕</button>
			</view>
			<button class="search-btn" @click="handleSearch">搜索</button>
		</view>

		<!-- 搜索结果展示 -->
		<view class="result-section" v-if="scannedGoods">
			<view class="result-header">
				<text class="result-title">查询结果</text>
				<button class="close-btn" @click="scannedGoods = null">✕</button>
			</view>
			<view class="result-card">
				<view class="result-item">
					<text class="result-label">商品名称</text>
					<text class="result-value name">{{ scannedGoods.name }}</text>
				</view>
				<view class="result-divider"></view>
				<view class="result-row">
					<view class="result-col">
						<text class="result-label">进价</text>
						<text class="result-value">¥{{ scannedGoods.purchase_price }}</text>
					</view>
					<view class="result-col">
						<text class="result-label">卖价</text>
						<text class="result-value">¥{{ scannedGoods.selling_price }}</text>
					</view>
					<view class="result-col">
						<text class="result-label">利润</text>
						<text class="result-value profit">¥{{ (scannedGoods.selling_price - scannedGoods.purchase_price).toFixed(2) }}</text>
					</view>
				</view>
				<view class="result-divider" v-if="scannedGoods.remark"></view>
				<view class="result-item" v-if="scannedGoods.remark">
					<text class="result-label">备注</text>
					<text class="result-value remark">{{ scannedGoods.remark }}</text>
				</view>
			</view>
		</view>

		<!-- 空状态提示 -->
		<view class="empty-tip" v-if="!scannedGoods && !searchKeyword">
			<view class="tip-icon">💡</view>
			<text class="tip-text">使用上方功能开始管理商品</text>
			<text class="tip-sub">扫码快速查询 ｜ 添加新商品</text>
		</view>

		<!-- 新增商品弹窗 -->
		<view class="popup" v-if="showPopup">
			<view class="popup-mask" @click="closeAddForm"></view>
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">新增商品</text>
					<button class="popup-close" @click="closeAddForm">✕</button>
				</view>

				<view class="form">
					<view class="form-item">
						<text class="form-label">商品名称 <text class="required">*</text></text>
						<input type="text" v-model="formData.name" placeholder="请输入商品名称" class="form-input" />
					</view>

					<view class="form-row">
						<view class="form-item half">
							<text class="form-label">进价 <text class="required">*</text></text>
							<view class="input-with-unit">
								<input type="digit" v-model.number="formData.purchase_price" placeholder="0.00" class="form-input" />
								<text class="unit">元</text>
							</view>
						</view>
						<view class="form-item half">
							<text class="form-label">卖价 <text class="required">*</text></text>
							<view class="input-with-unit">
								<input type="digit" v-model.number="formData.selling_price" placeholder="0.00" class="form-input" />
								<text class="unit">元</text>
							</view>
						</view>
					</view>

					<view class="form-item">
					<text class="form-label">商品条码 <text class="required">*</text></text>
					<view class="barcode-input-row">
						<input type="text" v-model="formData.barcode" placeholder="请输入或扫描商品条码" class="form-input barcode-input" />
						<button class="scan-barcode-btn" @click="scanBarcodeForForm">
							<text class="btn-icon">📷</text>
							<text>扫码</text>
						</button>
					</view>
				</view>

					<view class="form-item">
						<text class="form-label">备注</text>
						<textarea v-model="formData.remark" placeholder="可选填" class="form-textarea" :maxlength="100" />
						<text class="char-count">{{ (formData.remark && formData.remark.length) || 0 }}/100</text>
					</view>
				</view>

				<view class="popup-footer">
					<button class="btn-cancel" @click="closeAddForm">取消</button>
					<button class="btn-submit" @click="submitForm">保存商品</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			scannedGoods: null,
			showPopup: false,
			searchKeyword: '',
			userInfo: null,
			formData: {
				name: '',
				purchase_price: '',
				selling_price: '',
				barcode: '',
				remark: ''
			}
		};
	},
	computed: {
		roleText() {
			const roleMap = {
				'store_manager': '店长',
				'manager': '经理',
				'staff': '店员'
			};
			return (this.userInfo && roleMap[this.userInfo.role]) || '';
		}
	},
	onLoad() {
		this.userInfo = uni.getStorageSync('userInfo');
		if (!this.userInfo || !this.userInfo.id) {
			uni.navigateTo({ url: '/pages/login/login' });
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
						this.queryGoodsByBarcode(res.content.trim());
					}
				}
			});
			// #endif

			// #ifndef H5
			uni.scanCode({
				success: (res) => {
					this.queryGoodsByBarcode(res.result);
				},
				fail: () => {
					uni.showToast({ title: '扫码失败', icon: 'none' });
				}
			});
			// #endif
		},

		// 根据条码查询商品
		async queryGoodsByBarcode(barcode) {
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
						barcode,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0 && res.result.data.length > 0) {
					this.scannedGoods = res.result.data[0];
				} else {
					uni.showModal({
						title: '未找到商品',
						content: '该商品不存在，是否立即录入？',
						success: (modalRes) => {
							if (modalRes.confirm) {
								this.formData = { name: '', purchase_price: '', selling_price: '', barcode, remark: '' };
								this.showPopup = true;
							}
						}
					});
				}
			} catch {
				uni.showToast({ title: '查询失败', icon: 'none' });
			}
		},

		// 显示新增表单
		showAddForm() {
			this.formData = { name: '', purchase_price: '', selling_price: '', barcode: '', remark: '' };
			this.showPopup = true;
		},

		// 关闭新增表单
		closeAddForm() {
			this.showPopup = false;
		},

		// 清空搜索
		clearSearch() {
			this.searchKeyword = '';
			this.scannedGoods = null;
		},

		// 扫码录入条码（用于表单）
		scanBarcodeForForm() {
			// #ifdef H5
			uni.showModal({
				title: '输入条码',
				content: 'H5 环境不支持扫码，请手动输入商品条码',
				editable: true,
				placeholderText: '请输入商品条码',
				success: (res) => {
					if (res.confirm && res.content) {
						this.formData.barcode = res.content.trim();
					}
				}
			});
			// #endif

			// #ifndef H5
			uni.scanCode({
				success: (res) => {
					this.formData.barcode = res.result;
					uni.showToast({ title: '扫码成功', icon: 'success' });
				},
				fail: () => {
					uni.showToast({ title: '扫码失败', icon: 'none' });
				}
			});
			// #endif
		},

		// 提交表单
		async submitForm() {
			if (!this.formData.name) {
				uni.showToast({ title: '请输入商品名称', icon: 'none' });
				return;
			}
			if (!this.formData.purchase_price || this.formData.purchase_price <= 0) {
				uni.showToast({ title: '请输入有效的进价', icon: 'none' });
				return;
			}
			if (!this.formData.selling_price || this.formData.selling_price <= 0) {
				uni.showToast({ title: '请输入有效的卖价', icon: 'none' });
				return;
			}
			if (!this.formData.barcode) {
				uni.showToast({ title: '请输入商品条码', icon: 'none' });
				return;
			}

			try {
				const app = getApp().globalData.cloudbase;
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.showToast({ title: '用户信息不完整', icon: 'none' });
					return;
				}

				// 检查条码是否已存在
				const checkRes = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'queryByBarcode',
						barcode: this.formData.barcode,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (checkRes.result.code === 0 && checkRes.result.data.length > 0) {
					uni.showToast({ title: '条码已存在', icon: 'none' });
					return;
				}

				// 保存商品
				const profit = parseFloat(this.formData.selling_price) - parseFloat(this.formData.purchase_price);
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'add',
						data: {
							...this.formData,
							profit,
							openid: userInfo.openid || '',
							createdAt: new Date().toISOString()
						},
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0) {
					uni.showToast({ title: '添加成功', icon: 'success' });
					this.closeAddForm();
				} else {
					uni.showToast({ title: '保存失败', icon: 'none' });
				}
			} catch {
				uni.showToast({ title: '保存失败', icon: 'none' });
			}
		},

		// 搜索商品
		async handleSearch() {
			if (!this.searchKeyword) {
				this.scannedGoods = null;
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
						keyword: this.searchKeyword,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});

				if (res.result.code === 0) {
					const results = res.result.data || [];
					if (results.length > 0) {
						this.scannedGoods = results[0];
					} else {
						this.scannedGoods = null;
						uni.showToast({ title: '未找到匹配的商品', icon: 'none' });
					}
				}
			} catch {
				uni.showToast({ title: '搜索失败', icon: 'none' });
			}
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

/* 欢迎区域 */
.welcome-section {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 24rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 10rpx 40rpx rgba(102, 126, 234, 0.3);
}

.welcome-header {
	margin-bottom: 30rpx;
}

.greeting {
	display: block;
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-bottom: 10rpx;
}

.app-name {
	display: block;
	font-size: 48rpx;
	font-weight: bold;
	color: #ffffff;
}

.user-brief {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.welcome-text {
	font-size: 32rpx;
	color: #ffffff;
}

.role-badge {
	padding: 6rpx 20rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
	font-weight: 500;
}

.role-badge.store_manager {
	background: rgba(255, 107, 107, 0.9);
	color: #fff;
}

.role-badge.manager {
	background: rgba(78, 205, 196, 0.9);
	color: #fff;
}

.role-badge.staff {
	background: rgba(69, 183, 209, 0.9);
	color: #fff;
}

/* 快捷操作区 */
.quick-actions {
	margin-bottom: 30rpx;
}

.action-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
	padding-left: 10rpx;
}

.action-grid {
	display: flex;
	gap: 20rpx;
}

.action-item {
	flex: 1;
	background: #ffffff;
	border-radius: 20rpx;
	padding: 40rpx 30rpx;
	text-align: center;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	transition: transform 0.2s;
}

.action-item:active {
	transform: scale(0.98);
}

.action-icon {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 20rpx;
}

.action-item.scan .action-icon {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.action-item.add .action-icon {
	background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.iconfont {
	font-size: 48rpx;
}

.action-name {
	display: block;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
}

.action-desc {
	display: block;
	font-size: 24rpx;
	color: #999;
}

/* 搜索区域 */
.search-section {
	display: flex;
	gap: 20rpx;
	margin-bottom: 30rpx;
}

.search-box {
	flex: 1;
	display: flex;
	align-items: center;
	background: #ffffff;
	border-radius: 16rpx;
	padding: 0 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.search-icon {
	font-size: 32rpx;
	margin-right: 15rpx;
}

.search-input {
	flex: 1;
	height: 90rpx;
	font-size: 30rpx;
	border: none;
	background: transparent;
}

.clear-btn {
	width: 50rpx;
	height: 50rpx;
	line-height: 50rpx;
	padding: 0;
	margin: 0;
	font-size: 24rpx;
	color: #999;
	background: #f0f0f0;
	border-radius: 50%;
}

.search-btn {
	width: 140rpx;
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 500;
	border-radius: 16rpx;
	padding: 0;
	margin: 0;
	box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
}

/* 结果区域 */
.result-section {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.result-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.close-btn {
	width: 50rpx;
	height: 50rpx;
	line-height: 50rpx;
	padding: 0;
	margin: 0;
	font-size: 28rpx;
	color: #999;
	background: #f5f5f5;
	border-radius: 50%;
}

.result-card {
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 30rpx;
}

.result-item {
	margin-bottom: 20rpx;
}

.result-item:last-child {
	margin-bottom: 0;
}

.result-label {
	display: block;
	font-size: 24rpx;
	color: #999;
	margin-bottom: 10rpx;
}

.result-value {
	display: block;
	font-size: 32rpx;
	color: #333;
	font-weight: 500;
}

.result-value.name {
	font-size: 40rpx;
	font-weight: bold;
	color: #667eea;
}

.result-value.profit {
	color: #ff6b6b;
	font-weight: bold;
}

.result-value.remark {
	font-size: 28rpx;
	color: #666;
}

.result-divider {
	height: 2rpx;
	background: #e0e0e0;
	margin: 25rpx 0;
}

.result-row {
	display: flex;
	justify-content: space-between;
}

.result-col {
	text-align: center;
	flex: 1;
}

/* 空状态 */
.empty-tip {
	text-align: center;
	padding: 80rpx 40rpx;
}

.tip-icon {
	font-size: 80rpx;
	margin-bottom: 20rpx;
}

.tip-text {
	display: block;
	font-size: 32rpx;
	color: #333;
	margin-bottom: 15rpx;
}

.tip-sub {
	display: block;
	font-size: 26rpx;
	color: #999;
}

/* 弹窗 */
.popup {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: flex-end;
}

.popup-mask {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
}

.popup-content {
	width: 100%;
	background: #ffffff;
	border-radius: 40rpx 40rpx 0 0;
	padding: 40rpx;
	position: relative;
	z-index: 10000;
	max-height: 85vh;
	overflow-y: auto;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 40rpx;
}

.popup-title {
	font-size: 40rpx;
	font-weight: bold;
	color: #333;
}

.popup-close {
	width: 60rpx;
	height: 60rpx;
	line-height: 60rpx;
	padding: 0;
	margin: 0;
	font-size: 32rpx;
	color: #999;
	background: #f5f5f5;
	border-radius: 50%;
}

/* 表单 */
.form {
	margin-bottom: 40rpx;
}

.form-item {
	margin-bottom: 30rpx;
}

.form-row {
	display: flex;
	gap: 20rpx;
}

.form-item.half {
	flex: 1;
}

.form-label {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 15rpx;
	font-weight: 500;
}

.required {
	color: #ff6b6b;
}

.form-input {
	width: 100%;
	height: 90rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 25rpx;
	font-size: 30rpx;
	border: 2rpx solid transparent;
	transition: border-color 0.2s;
}

.form-input:focus {
	border-color: #667eea;
}

.input-with-unit {
	display: flex;
	align-items: center;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding-right: 25rpx;
}

.input-with-unit .form-input {
	background: transparent;
	flex: 1;
}

.unit {
	font-size: 28rpx;
	color: #666;
}

/* 条码输入行 */
.barcode-input-row {
	display: flex;
	gap: 15rpx;
	align-items: center;
}

.barcode-input {
	flex: 1;
}

.scan-barcode-btn {
	width: 160rpx;
	height: 90rpx;
	padding: 0;
	margin: 0;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	font-size: 26rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
}

.scan-barcode-btn .btn-icon {
	font-size: 28rpx;
}

.form-textarea {
	width: 100%;
	height: 160rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 20rpx 25rpx;
	font-size: 30rpx;
	border: 2rpx solid transparent;
}

.char-count {
	display: block;
	text-align: right;
	font-size: 24rpx;
	color: #999;
	margin-top: 10rpx;
}

/* 弹窗底部 */
.popup-footer {
	display: flex;
	gap: 20rpx;
	padding-top: 20rpx;
}

.btn-cancel,
.btn-submit {
	flex: 1;
	height: 90rpx;
	line-height: 90rpx;
	font-size: 32rpx;
	font-weight: 500;
	border-radius: 16rpx;
	padding: 0;
	margin: 0;
}

.btn-cancel {
	background: #f5f5f5;
	color: #666;
}

.btn-submit {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
}
</style>
