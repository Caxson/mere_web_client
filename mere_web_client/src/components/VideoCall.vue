<template>
    <div>
        <h1>音频输入和监测</h1>
        <!-- 开始监测按钮 -->
        <button @click="toggleMonitoring">
            {{ isMonitoring ? '停止监测' : '开始监测' }}
        </button>
        <!-- 讲话状态下显示音量能量条 -->
        <div v-if="state === 'speaking' && isMonitoring">
            <p>讲话中...</p>
            <div
                :style="{
          height: '10px',
          width: '100%',
          backgroundColor: 'blue',
          transform: `scaleX(${volumeLevel})`,
          transition: 'transform 0.1s linear'
        }"
            ></div>
            <div>音量等级: {{ (volumeLevel * 100).toFixed(2) }}%</div>
        </div>
        <!-- 读取状态下显示中断按钮 -->
        <div v-if="state === 'reading'">
            <p>数字人正在处理...</p>
            <button @click="interrupt">中断</button>
        </div>
        <!-- 如果有数字人音频完成，显示音频控件 -->
        <audio v-if="digitalHumanAudioUrl" controls :src="digitalHumanAudioUrl"></audio>
    </div>
</template>

<script>
export default {
    data() {
        return {
            audioContext: null, // 音频上下文，用于处理音频数据
            analyser: null, // 分析器节点，用于音量检测
            dataArray: null, // 用于存储音频数据
            isMonitoring: false, // 标记是否正在监测
            volumeLevel: 0, // 音量等级，用于显示音量条
            state: 'speaking', // 当前状态：'speaking' 或 'reading'
            silenceDuration: 2000, // 静默持续时间阈值（毫秒）
            silenceStartTime: null, // 静默开始时间
            lastSoundTime: 0, // 记录最后检测到声音的时间
            maxVolumeThreshold: 0.01, // 最大声音阈值
            pollInterval: null, // 轮询定时器
            requestId: null, // 当前请求ID（用于中断）
            digitalHumanAudioUrl: '', // 数字人音频的URL
        };
    },
    methods: {
        // 切换监测状态
        async toggleMonitoring() {
            if (!this.isMonitoring) {
                await this.startMonitoring();
            } else {
                this.stopMonitoring();
            }
        },
        // 开始监测
        async startMonitoring() {
            if (!navigator.mediaDevices) {
                alert('浏览器不支持音频输入设备！');
                return;
            }
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = this.audioContext.createMediaStreamSource(audioStream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 2048;
                const bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(bufferLength);
                source.connect(this.analyser);
                this.isMonitoring = true;
                this.state = 'speaking'; // 设置初始状态为讲话
                this.lastSoundTime = Date.now(); // 初始化lastSoundTime为当前时间
                this.silenceStartTime = null;
                this.monitorAudio();
            } catch (err) {
                console.error('获取音频流失败:', err);
                alert('无法获取音频输入设备。');
            }
        },
        // 停止监测
        stopMonitoring() {
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            this.isMonitoring = false;
            this.state = 'speaking';
            this.volumeLevel = 0;
            this.silenceStartTime = null;
            if (this.pollInterval) {
                clearTimeout(this.pollInterval);
                this.pollInterval = null;
            }
        },
        // 监测音频能量
        monitorAudio() {
            const checkAudio = () => {
                if (!this.isMonitoring || this.state !== 'speaking') {
                    return;
                }
                this.analyser.getByteTimeDomainData(this.dataArray);
                let sum = 0;
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += Math.abs(this.dataArray[i] - 128);
                }
                let currentVolumeLevel = sum / this.dataArray.length / 128;
                this.volumeLevel = currentVolumeLevel;

                if (currentVolumeLevel > this.maxVolumeThreshold) {
                    // 检测到声音的阈值
                    this.lastSoundTime = Date.now(); // 更新最后声音检测时间
                    this.silenceStartTime = null; // 重置静默开始时间
                } else {
                    // 没有检测到声音
                    if (!this.silenceStartTime) {
                        this.silenceStartTime = Date.now(); // 记录静默开始时间
                    }
                    const silenceElapsed = Date.now() - this.silenceStartTime;
                    if (silenceElapsed >= this.silenceDuration) {
                        // 静默持续超过阈值，进入读取状态
                        this.enterReadingState();
                        return;
                    }
                }

                requestAnimationFrame(checkAudio); // 继续实时检测声音
            };
            checkAudio();
        },
        // 进入读取状态
        async enterReadingState() {
            this.state = 'reading'; // 设置状态为读取
            this.isMonitoring = false; // 停止监测
            this.volumeLevel = 0; // 重置音量等级
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            // 发送上传对话请求到服务器
            await this.sendDialogUploadRequest();
        },
        // 发送上传对话请求到服务器
        async sendDialogUploadRequest() {
            try {
                const response = await fetch('YOUR_BACKEND_UPLOAD_DIALOG_URL', {
                    method: 'POST',
                });
                const data = await response.json();
                console.log('上传对话成功:', data);
                this.requestId = data.request_id; // 假设后端返回 request_id
                // 开始轮询后端以获取处理结果
                this.pollBackendForResponse(this.requestId);
            } catch (error) {
                console.error('上传对话失败:', error);
                // 根据需求，可以在这里重新进入讲话状态或显示错误
                this.state = 'speaking';
                this.isMonitoring = true;
                this.startMonitoring(); // 重新开始监测
            }
        },
        // 轮询后端以获取处理结果
        async pollBackendForResponse(requestId) {
            const poll = async () => {
                try {
                    const response = await fetch(`YOUR_BACKEND_CHECK_STATUS_URL?request_id=${requestId}`);
                    const data = await response.json();
                    if (data.status === 'awaiting') {
                        // 后端处理结束，进入等待输入环节，处理相应逻辑
                        console.log('数字人音频被中断');
                        this.state = 'speaking';
                        this.isMonitoring = true;
                        this.startMonitoring(); // 重新开始监测
                        return;
                    } else {
                        // 继续轮询
                        setTimeout(poll, 1000); // 每秒轮询一次
                    }
                } catch (error) {
                    console.error('轮询过程中出错:', error);
                    // 根据需求，可以在这里重新进入讲话状态或显示错误
                    this.state = 'speaking';
                    this.isMonitoring = true;
                    this.startMonitoring(); // 重新开始监测
                }
            };
            poll();
        },
        // 中断数字人音频
        async interrupt() {
            try {
                // 调用后端中断接口
                const response = await fetch('YOUR_BACKEND_INTERRUPT_URL', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ request_id: this.requestId }), // 传递当前的 request_id
                });
                const data = await response.json();
                if (data.success) {
                    console.log('中断请求成功');
                    // 重新进入讲话状态
                    this.digitalHumanAudioUrl = '';
                    this.state = 'speaking';
                    this.isMonitoring = true;
                    this.startMonitoring(); // 重新开始监测
                } else {
                    console.error('中断请求失败:', data.message);
                }
            } catch (error) {
                console.error('中断请求出错:', error);
            }
        },
    },
};
</script>

<style scoped>
/* 根据需要添加样式 */
button {
    padding: 10px 20px;
    font-size: 16px;
    margin-bottom: 20px;
}

div {
    margin-top: 10px;
}

audio {
    margin-top: 20px;
}
</style>