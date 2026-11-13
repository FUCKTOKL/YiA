# EV R0 电气架构与接口草案

这是功能级电气设计与接口分配，不是逐引脚原理图或经过 ERC 的网表。未锁定部分不进入生产设计。

## 1. 电源

```text
5 V 充电触点
    │ 输入限流／反接与 ESD 保护，参数待电芯及底座确认
    ▼
BQ24074 PowerPath ── 1S 4.2 V 体系保护电池 + NTC
    │ SYS
    ├─ TPS63802 → 3.3 V 主控、IMU、数字麦克风及受控音频供电
    ├─ TPS7A02 1.8 V → PPG 数字电源
    ├─ TPS7A02 2.8 V → LCD 参考电源，需按最终面板确认
    └─ TPS61099 → 独立 LED 电源，MAX30101 初步按厂家 5 V 方案
```

选择 BQ24074 与独立稳压，是为电源路径和无线／音频瞬态留出设计空间；不把低电流稳压输出直接当作主控峰值电源。[BQ24074](https://www.ti.com/product/BQ24074)与 [TPS63802](https://www.ti.com/product/TPS63802) 的额定能力依赖工作条件和外围设计。

充电电流不按充电芯片最大能力设置。以实际电芯允许值、NTC、保护板、连接线及热测试为依据。默认不进行边充边佩戴测温的性能评估。

MAX30101 的电源按厂家要求分开处理；其集成 LED 和光电器件不意味着已经具备可靠的腕部指标算法。参考 [MAX30101 产品页](https://www.analog.com/en/products/max30101.html)。

## 2. 核心候选器件

| 部分 | 候选 | R0 说明 |
|---|---|---|
| MCU | ESP32-S3-MINI-1U-N4R2 | 模块本体 15.4 × 15.4 × 2.4 mm；4 MB Flash、2 MB PSRAM；外置天线 |
| PPG | MAX30101EFD+ | 5.6 × 3.3 × 1.55 mm；独立传感器板，绿／红／红外方向 |
| IMU | BMI270 | 腕部活动及冲击原始数据方向；算法需自行验证 |
| 皮温 | MAX30208 | 2 × 2 × 0.75 mm；独立热接触与隔离，不等于核心体温 |
| 充电 | BQ24074 | PowerPath 与 NTC，需外围和电芯验证 |
| 主稳压 | TPS63802 | 3.3 V 升降压；布局和器件电流额定值需复核 |
| LED 升压 | TPS61099 | 独立按需启用，避免回路噪声耦合 |
| LDO | TPS7A02 系列 | 分别产生 1.8 V 和 2.8 V；输出型号与时序需锁定 |
| I²C 电平 | PCA9306 | 3.3 V／1.8 V 总线转换与上拉；INT 信号另外核对 |
| LCD 电平 | TXU 系列方向，未定型 | 四路转换器不自动覆盖全部控制线；面板 pinout 锁定后核算通道数与上电状态 |
| 麦克风 | SPH0645LM4H-B 参考 | I²S 底部声孔；供货与生命周期需供应商确认 |
| 功放 | MAX98357A TQFN 参考 | 3 × 3 mm；低音量短句，设计功率不照搬芯片宣传最大值 |
| 显示 | ER-TFT1.54-1 机械参考 | 31.52 × 33.72 × 1.9 mm；标称 2.8 V；焊接式 FPC，不能直接假设现成连接器适配 |
| 电池／天线／扬声器／马达／FPC | 待供应商确定 | CAD 中只有包络占位，不能采购放行 |

来源：[ESP32 模块资料](https://documentation.espressif.com/esp32-s3-mini-1_mini-1u_datasheet_en.html)、[MAX30208](https://www.analog.com/en/products/MAX30208.html)、[BMI270](https://www.bosch-sensortec.com/en/products/motion-sensors/imus/bmi270)、[TPS61099](https://www.ti.com/product/TPS61099)、[TPS7A02](https://www.ti.com/product/TPS7A02)、[PCA9306](https://www.ti.com/product/PCA9306)、[TXU0104](https://www.ti.com/product/TXU0104)、[麦克风资料](https://www.knowles.com/docs/default-source/model-downloads/sph0645lm4h-b-datasheet-rev-c.pdf)、[功放资料](https://www.analog.com/en/products/MAX98357A.html)、[屏幕机械参考](https://www.buydisplay.com/chinese/catalog/product/view/id/1815/)。

## 3. SoC GPIO 草案

下表分配 SoC GPIO，不是模块焊盘编号。锁定模块版本后，仍需核对模块引脚、内部 Flash／PSRAM、启动状态与固件约束。

| 信号 | GPIO 草案 | 备注 |
|---|---|---|
| I²C SDA / SCL | 8 / 9 | 主机侧 3.3 V，传感器侧按器件转换 |
| PPG INT / IMU INT | 6 / 7 | PPG 中断电平独立处理 |
| I²S BCLK / WS | 12 / 13 | 麦克风和功放共用时钟的候选方案 |
| 麦克风数据 / 功放数据 | 14 / 15 | 原型先半双工，采样率与时钟需按器件验证 |
| 功放使能 | 16 | 默认关闭，避免空闲功耗 |
| LCD MOSI / SCLK | 11 / 10 | 按面板逻辑电压转换 |
| LCD CS / DC / RESET | 17 / 18 / 21 | 控制线通道与上电默认状态待复核 |
| 背光 PWM | 47 | 经驱动，不能由 GPIO 直接承担背光电流 |
| 对话键 / 振动控制 | 4 / 5 | 驱动、保护与防抖需设计 |
| LED 升压使能 / 显示电源使能 | 39 / 40 | 停机与唤醒时序需设计 |
| 温度中断 | 41 | 可先轮询，避免无必要中断 |
| USB D- / D+ | 19 / 20 | 仅预留维修烧录触点区域；焊盘未发布 |
| BOOT / EN | 专用维修入口 | 不随意复用启动配置脚 |

主板到传感器板的 8 线接口暂按 GND、3V3、1V8、LED_V、SDA_L、SCL_L、PPG_INT_L、GND 规划；物理接点顺序、回流和滤波需在布线阶段调整，不直接作为 FPC 采购 pinout。温度器件可在低压侧工作，地址与中断方案需复核。

## 4. 关键未决项

- 电池放电与保护能力必须覆盖主控／无线／音频瞬态；不足时调整负载策略、电芯或外壳尺寸。
- 模块使用外部天线；连接器类型、线缆弯曲、贴附材料和人体负载要按选定天线资料验证。
- LCD 标称电压和 FPC 已被作为限制记录，未直接用 3.3 V 信号连接到面板。
- 电平转换器的 EN、上拉、电源关闭后的反灌、INT 和所有默认状态仍需逐引脚设计。
- PPG 与温度不具备经验证的指标性能；EDA、ECG 和自动求助不在 R0 电路中。
- 没有完整电气原理图、量产封装、布线、Gerber、贴片坐标或 ERC／DRC 结果。
