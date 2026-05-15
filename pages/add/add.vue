<template>
	<view class="content">
		<text class="title">新增商品</text>
		
		<view class="form">
			<view class="form-item">
				<text class="label">商品名称：</text>
				<input type="text" v-model="formData.name" placeholder="请输入商品名称" class="input" />
			</view>
			
			<view class="form-item">
				<text class="label">条码：</text>
				<input type="text" v-model="formData.barcode" placeholder="请输入商品条码" class="input" />
			</view>
			
			<view class="form-item">
				<text class="label">进价：</text>
				<input type="number" v-model.number="formData.purchase_price" placeholder="请输入进价" class="input" />
			</view>
			
			<view class="form-item">
				<text class="label">卖价：</text>
				<input type="number" v-model.number="formData.selling_price" placeholder="请输入卖价" class="input" />
			</view>
			
			<view class="form-item">
				<text class="label">备注：</text>
				<textarea v-model="formData.remark" placeholder="请输入备注" class="textarea" />
			</view>
			
			<button class="submit-btn" @click="submitForm">保存</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			formData: {
				name: '',
				barcode: '',
				purchase_price: 0,
				selling_price: 0,
				remark: ''
			},
			openid: ''
		};
	},
	onLoad(options) {
		// 如果从扫码页面跳转过来，会携带 barcode 参数
		if (options && options.barcode) {
			this.formData.barcode = options.barcode;
		}
		
		// 读取本地存储的用户信息
		const userInfo = uni.getStorageSync('userInfo');
		if (userInfo && userInfo.id) {
			// 确保 openid 字段存在
			this.openid = userInfo.openid || userInfo.id;
			console.log('✅ 获取用户信息成功:', userInfo);
		} else {
			console.error('❌ 未找到用户信息，跳转到登录页');
			uni.navigateTo({
				url: '/pages/login/login'
			});
			return;
		}
	},
	methods: {
		async submitForm() {
			// 简单验证
			if (!this.formData.name) {
				uni.showToast({
					title: '请输入商品名称',
					icon: 'none'
				});
				return;
			}
			
			if (!this.formData.barcode) {
				uni.showToast({
					title: '请输入商品条码',
					icon: 'none'
				});
				return;
			}
			
			if (this.formData.purchase_price <= 0) {
				uni.showToast({
					title: '请输入有效的进价',
					icon: 'none'
				});
				return;
			}
			
			if (this.formData.selling_price <= 0) {
				uni.showToast({
					title: '请输入有效的卖价',
					icon: 'none'
				});
				return;
			}
			
			// 检查条码是否已存在
			try {
				const app = getApp().globalData.cloudbase;
				
				// 从本地存储获取用户信息
				const userInfo = uni.getStorageSync('userInfo');
				if (!userInfo || !userInfo.shop_id) {
					uni.showToast({ title: '用户信息不完整，请重新登录', icon: 'none' });
					return;
				}
				
				// 调用云函数检查条码
				const res = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'queryByBarcode',
						barcode: this.formData.barcode,
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				
				if (res.result.code === 0 && res.result.data.length > 0) {
					// 条码已存在
					uni.showToast({
						title: '条码已存在，请使用其他条码',
						icon: 'none'
					});
					return;
				}
				
				// 计算利润
				const profit = this.formData.selling_price - this.formData.purchase_price;
				
				// 保存到数据库
				const saveRes = await app.callFunction({
					name: 'mysql-api',
					data: {
						action: 'add',
						data: {
							...this.formData,
							profit: profit,
							openid: userInfo.openid || '',
							createdAt: new Date().toISOString()
						},
						shopId: userInfo.shop_id,
						role: userInfo.role
					}
				});
				
				if (saveRes.result.code === 0) {
					console.log('保存成功');
					uni.showToast({
						title: '保存成功',
						icon: 'success'
					});
					
					// 保存成功后返回上一页
					setTimeout(() => {
						uni.navigateBack();
					}, 1500);
				} else {
					console.error('保存失败:', saveRes.result);
					uni.showToast({
						title: '保存失败，请重试',
						icon: 'none'
					});
				}
			} catch (err) {
				console.error('保存失败:', err);
				uni.showToast({
					title: '保存失败，请重试',
					icon: 'none'
				});
			}
		}
	}
};
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		padding: 40rpx;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 40rpx;
		text-align: center;
		color: #333;
	}

	.form {
		width: 100%;
	}

	.form-item {
		display: flex;
		flex-direction: column;
		margin-bottom: 30rpx;
	}

	.label {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 10rpx;
	}

	.input {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #ddd;
		border-radius: 10rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}

	.textarea {
		width: 100%;
		height: 150rpx;
		border: 1rpx solid #ddd;
		border-radius: 10rpx;
		padding: 20rpx;
		font-size: 28rpx;
		resize: none;
	}

	.submit-btn {
		width: 100%;
		height: 80rpx;
		background-color: #007aff;
		color: white;
		font-size: 28rpx;
		border-radius: 10rpx;
		margin-top: 40rpx;
	}
</style>