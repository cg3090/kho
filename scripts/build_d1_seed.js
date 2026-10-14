import fs from 'fs';
import path from 'path';

// Parse PostgreSQL dump into SQLite compatible INSERT OR REPLACE statements
const rawUserDump = `
-- Customers
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-30', 'CTY  XÂY LẤP HỒNG ĐỨC I', 'KH-506694-30', NULL, 'LIÊN HƯƠNG ,TUY PHONG, BÌNH THUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-48', 'CTY .  QUẢNG CÁO PHAT NIÊN GIÁM', 'KH-506694-48', NULL, '178 VÕ THỊ SÁU , P 7. Q 3 TP. HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-43', 'CTY :  BẢO HỘ Á CHAU', 'KH-506694-43', NULL, 'SỐ 29  ĐƯỜNG SỐ 2  .CX BÌNH THỚI P . 8 Q . 11 TPHCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-41', 'CTY : CMA CRM', 'KH-506694-41', NULL, '81-85 HÀM NGHI Q. 1 TP : HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-42', 'CTY : NAM A', 'KH-506694-42', NULL, '34 -DƯỜNG 33 AN DƯƠNG VƯƠNG P.10 Q. 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-50', 'CTY : PHÚ THỊNH', 'KH-506694-50', NULL, '436 B /106/25 , ĐƯỜNG 3-2 , P12 , Q 10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-44', 'CTY : TNHH SX TM A KIM', 'KH-506694-44', NULL, 'SỐ 343/32 SƯ VẠN HẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-9', 'CTY : TNHH XNK KHÔI NGUYÊN', '03 09 37 00 13', NULL, '27 B NGÔ TẤT TỐ , P22 , Q BÌNH THẠNH, MST : 03 09 37 00 13');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-40', 'CTY ; TNHH-TM PHAN NHÂN', 'KH-506694-40', NULL, '107 Đ 2 P .25 .Q. BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-26', 'CTY CHIAKI', 'KH-506694-26', NULL, '24 DUY TÂN  PHÚ NHUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-25', 'CTY CPTMDV DAU TU VA PHAT TRIỂN HOÀNG ANH', 'KH-506694-25', NULL, '22/7 K.P.1. HUYNH TAN PHAT Q 7');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-28', 'CTY HỒNG NGUYỄN', 'KH-506694-28', NULL, '22 ĐƯỜNG 19 XÃ BÌNH HƯNG H B- CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-10', 'CTY THUẬN THẮNG', 'KH-506693-10', NULL, '105 DƯỜNG Đ 2.P 25. Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-34', 'CTY TNHH LONG ANH', 'KH-506694-34', NULL, '1073. TRẦN HƯNG ĐẠO - TP: QUY NHƠN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-35', 'CTY TNHH TM  LIÊN ANH', 'KH-506694-35', NULL, '129 .TĂNG BẠC HỔ - TP : QUY NHƠN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-53', 'CTY: ĐỒNG TiẾN', 'KH-506694-53', NULL, '49- TÔN ĐỨC THẮNG TP : QUY NHƠN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-58', 'CTY: PHƯƠNG NAM ( NGUYÊN OANH )', '0301860552', NULL, '940 ĐƯỜNG  3-2 , P15 , Q 11 , MST : 0301860552');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-38', 'CTY: TNHH MTV TM DV KỸ THUẬT HOÀNG SƠN', 'KH-506694-38', NULL, '79 ĐƯỜNG D2 , P 25 Q, BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-67', 'CTY: TNHH TM DV QuẢNG CÁO GIA CÁT', 'KH-506694-67', NULL, '35 VÕ THÀNH TRANG , P, 11, Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-24', 'CTY: TNHH TM VA DV CHAU LE', 'KH-506694-24', NULL, 'C5/9A PHAM HUNG , H BINH CHANH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-66', 'CTY: TNHH TM XUÂN VY', 'KH-506695-110', NULL, '405/4 TRƯỜNG CHINH , P 14 , Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-45', 'CTY; QUOC HUY ANH', 'KH-506694-45', NULL, '54 NGUYỄN BÁ TUYỂN . P12 . Q TAN BINH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-46', 'CTY; TNHH- MTV . VPP-  HUY MINH', 'KH-506694-46', NULL, '192 VINH VIEN P.9 Q . 10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-65', 'DĐỊA CHỈ : 232/15 TÔ HiỆU, P HIÊP TÂN, T PHÚ', 'KH-506694-65', NULL, '232/15 , TÔ HiỆU , P HiỆP TÂN , TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-3', 'Duy  HỢP', '0310245112', NULL, '272 NƠ TRANG LONG .P12.Q BÌNH THẠNH . MST : 0310245112');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-39', 'HUYNH GIANG', 'KH-506694-39', NULL, '88 ĐƯỜNG VÀNH ĐAI , P10 , Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-37', 'NGỌC THỦY', 'KH-506694-37', NULL, '89 . LÝ THÁI TỔ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-54', 'NHÀ SÁCH : NGUYỄN VĂN CỪ ( HÀ NỘI )', 'KH-506694-54', NULL, '356 - LÊ QUANG SUNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-57', 'NHÀ SÁCH : PHÚC NHÂN', 'KH-506694-57', NULL, 'F1/63 - ĐƯỜNG QUÁCH ĐIÊU , XÃ VĨNH LỘC A, BÌNH CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-23', 'Nhà sách Nguyễn Văn Cừ  ( lê văn việt )', 'KH-506694-23', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-22', 'Nhà sách Nguyễn Văn Cừ  ( sinh viên )', 'KH-506694-22', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-15', 'Nhà sách Nguyễn Văn Cừ  Đồng nai )', 'KH-506693-15', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-32', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( BẾN TRE)', 'KH-506694-32', NULL, '356 LE QUANG SUNG , Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-16', 'Nhà sách Nguyễn Văn Cừ ( bình thuận )', 'KH-506693-16', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-18', 'Nhà sách Nguyễn Văn Cừ ( nguyễn tất  thành )', 'KH-506693-18', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-17', 'Nhà sách Nguyễn Văn Cừ ( phú yên )', 'KH-506693-17', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-33', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( Q . 2 )', 'KH-506694-33', NULL, '356 LE QUANG SUNG , Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-5', 'Nhà sách Nguyễn Văn Cừ ( Q. 1 )', 'KH-506693-5', NULL, '235 C Nguyễn Văn Cừ Q1');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-31', 'NHÀ SÁCH NGUYỄN VĂN CỪ ( TÂY NINH )', 'KH-506694-31', NULL, '356 LE QUANG SUNG , Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-2', 'Nhà sách Nguyễn Văn Cừ ( tổng kho )', 'KH-506693-2', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-14', 'Nhà sách Nguyễn Văn Cừ (6)', 'KH-506693-14', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-13', 'Nhà sách Nguyễn Văn Cừ (sa Đét )', 'KH-506693-13', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-19', 'Nhà sách Nguyễn Văn Cừ( 2)', 'KH-506693-19', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-12', 'Nhà sách Nguyễn Văn Cừ( 4)', 'KH-506693-12', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-11', 'Nhà sách Nguyễn Văn Cừ( Q12)', 'KH-506693-11', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-4', 'Nhà sách Tân Tạo', 'KH-506693-4', NULL, '1032 Quốc lộ 1A .Q Bình Tân');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-20', 'nhaà sách nguyễn văn cừ ( quãng ngãi )', 'KH-506693-20', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-21', 'nhaà sách nguyễn văn cừ ( tiền giang )', 'KH-506694-21', NULL, '356 Lê Quang Sung ,Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-36', 'PHOTO QUOC NGUYÊN', 'KH-506694-36', NULL, '……838… HỒNG BÀNG Q. 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-6', 'Thế Giới Phẳng', 'KH-506693-6', NULL, '491 Tô Hiến Thành . Q10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-52', 'VĂN CỪ ( QUÃNG TRỊ )', 'KH-506694-52', NULL, '356  - LÊ QUANG SUNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-8', 'VĂN CỪ :  (BÌNH CHÁNH)', 'KH-506693-8', NULL, '356 LÊ QUANG SUNG , Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-59', 'VĂN CỪ : ( BẢO LỘC )', 'KH-506694-59', NULL, '356 LÊ QUANG SUNG , Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-51', 'VĂN CỪ : ( QuẢNG NAM )', 'KH-506694-51', NULL, '356 LÊ QUANG SUNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-64', 'VĂN CỪ : THANH HÓA', 'KH-506694-64', NULL, '356 LEÊ QUANG SUNG , Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-49', 'VĂN PHÒNG PHẨM . THANH HOA', 'KH-506694-49', NULL, '62 - ĐƯỜNG TRẦN CHÁNH CHIẾU , P14 ,Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-56', 'VĂN PHÒNG PHẨM : PI TY', 'KH-506694-56', NULL, '131/661/29 - ĐƯỜNG LÊ LỢI . P3 . Q GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-55', 'VPP ; 45/88/10A - ( BÌNH TIÊN )', 'KH-506694-55', NULL, 'VPP : 45/88/10A - BÌNH TIÊN  - Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506693-7', 'C ty Tân Bảo Tính', 'KH-506693-7', NULL, '126A Y Ngong . TP Buôn mê Thuột');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-103', 'CTY : TNHH ViỆT BẢO LONG', 'KH-506695-103', NULL, '280/40 BÙI HỮU NGHĨA , P 2 , Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-126', 'CTY:  TNHH DV TM SAO BĂNG', 'KH-506696-126', NULL, '195/15/8 ĐIỆN BIÊN PHỦ . P 15 .Q BÌNH THẠNH*');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-93', 'CTY:  TNHH MTV ViỆT TRẦN', 'KH-506695-93', NULL, 'LÔ A ĐƯỜNG SỐ 1 , KCN LONG ĐỨC. XÃ LONG ĐỨC ,TP TRÀ VINH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-94', 'CTY:  TNHH TM - DV NHÂN DŨNG', 'KH-506695-94', NULL, '237/115 TRẦN VĂN ĐANG , P 11 , Q 3 , TP HCM ( 0303 851 296');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-78', 'CTY: BẢO ÂN', 'KH-506694-78', NULL, '80/3 KHIẾU NĂNG TỈNH , P AN LẠC , Q , BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-121', 'CTY: CỔ  PHẦN QUANG HƯNG PHÁT', 'KH-506695-121', NULL, '479, BÌNH DÔNG . P 13. Q 8');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-73', 'CTY: CỔ PHẦN CAO SU BẾN THÀNH', 'KH-506694-73', NULL, 'LÔ B3 - 1 KHU CÔNG NGHIỆP TÂY BẮC CỦ CHI TP, HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-97', 'CTY: CỔ PHẦN NGỌC DOANH', '0309788675', NULL, '152 NGUYỄN SĨ SÁCH , P 15 , Q TÂN BÌNH, MST : 0309788675');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-76', 'CTY: CỔ PHẦN PHÁT TRIỄN CÔNG NGHỆ NGHI ANH', 'KH-506694-76', NULL, '76 NGUYỄN XUÂN KHOÁI . P TÂN THÀNH . Q TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-82', 'CTY: cổ phần thương mại và phát triền nguyễn anh', 'KH-506694-82', NULL, '530 DT 742 . P phú mỹ . Thủ dầu một . Bình dương');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-128', 'CTY: CỔ PHẦN TRƯỜNG XUÂN', 'KH-506696-128', NULL, '74 LÊ LỢI , PLEIKU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-91', 'CTY: CÔNG NGHỆ XANH', 'KH-506695-115', NULL, '76/31/22 NGUYỄN SƠN . P PHÚ THỌ HOÀ . Q TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-109', 'CTY: CPTVKT VÀ XÂY DỰNG TP HCM', 'KH-506695-109', NULL, '98 TRẦN QUANG KHẢI . P TÂN DỊNH. Q 1 . TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-80', 'CTY: ĐẶNG THÀNH', 'KH-506694-80', NULL, '326/74 A ĐOÀN VĂN BƠ ; P16 , Q 4');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-96', 'CTY: HƯNG THÀNH', 'KH-506695-96', NULL, '74 LÝ THÁI TỔ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-112', 'CTY: TNHH  -TM - DV  MINH TRỊ', 'KH-506695-112', NULL, '12 A ĐƯỜNG D52 . P 12 . Q TÂN BINH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-99', 'CTY: TNHH  ĐiỆN - ĐiỆN TỬ MÊ TRẦN', 'KH-506695-99', NULL, '84 A2 , LÝ CHIÊU HOÀNG , P 10 , Q, 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-125', 'CTY: TNHH  HƯƠNG LINH', 'KH-506695-125', NULL, '116 ĐƯỜNG SỐ 41 , P TÂN QUY , Q7 , TPHCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-83', 'CTY: TNHH IN BAO BÌ TÂN ĐƯỢC LỢI', 'KH-506694-83', NULL, '7/1B KỲ ĐỒNG , P, 9 ,Q 3 TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-104', 'CTY: TNHH MTV TM DV KỸ THUẬT MAI ANH', 'KH-506695-104', NULL, '119 ĐƯỜNG D2 , P 25, Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-87', 'CTY: TNHH NAM THÔNG BẢO', 'KH-506694-87', NULL, '101 ĐƯỜNG SỐ 44 KDC BÌNH PHÚ . P 10 . Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-105', 'CTY: TNHH SÀI GÒN ĐỒ GỖ QuỐC TẾ S M I', 'KH-506695-105', NULL, '26/4 ĐƯƠNG LAM SƠN , P7 , Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-122', 'CTY: TNHH SX TM DV TIẾN CHUNG', 'KH-506695-122', NULL, '31/1A nguyễN Ảnh thủ - tây lân - bà điểm  HM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-107', 'CTY: TNHH SX TM, KIM HOÀN VŨ', 'KH-506695-107', NULL, 'H31 BIS K300 CỘNG HÒA , P12, Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-129', 'CTY: TNHH SX XNK VPP  GIA LONG', 'KH-506696-129', NULL, '131/6 NGUYỄN CUU DAM P TANSƠN NHI , Q TAN PHU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-111', 'CTY: TNHH TÂN NAM TRƯỜNG THỊNH', 'KH-506695-111', NULL, '56A LÊ CAO LÃNG . P PHÚ THẠNH . Q TÂN PHÚ TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-98', 'CTY: TNHH TM & DV NGUYỄN PHƯƠNG', 'KH-506695-98', NULL, '43 ĐƯƠNG SỐ1, P. BÌNH TRỊ ĐÔNG B , Q BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-75', 'CTY: TNHH TM & DV TĂNG HUY', 'KH-506694-75', NULL, '99/24 B LÊ ĐỨC THỌ , P17 , Q GÒ VẤP , TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-86', 'CTY: TNHH TM DV - VH ViỆT Ý', 'KH-506694-86', NULL, '743/26 HỒNG BÀNG . P 6 , Q, 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-127', 'CTY: TNHH TM DV PHÁT THÀNH LỘC', 'KH-506696-127', NULL, '24/ 14/19 TRƯƠNG PHƯỚC PHAN . P BÌNH TRỊ ĐÔNG Q , BT');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-84', 'CTY: TNHH TM DV QC XD TÂN HÙNG THUẬN', 'KH-506694-84', NULL, '107/4A NGÔ ĐỨC KẾ , P, 12 Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-74', 'CTY: TNHH TM DV THUẬN BẢO', 'KH-506694-74', NULL, '541/17 ĐƯỜNG ĐiỆN BIÊN PHỦ , P3 , Q3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-85', 'CTY: TNHHTMDV- XNK SAO MAI VINA', 'KH-506694-85', NULL, '72 PHỔ QUANG , P 2 , Q TÂN BÌNH , TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-68', 'CTY: VĨNH MINH HƯNG', 'KH-506694-68', NULL, '110/43/8 , BÀ HOM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-102', 'CỬA HÀNG NGỌC MAI', 'KH-506695-102', NULL, '127 : NGUYỄN TRẢI . P 2 . Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-108', 'DN TN GiẤY ViỆT QUANG', 'KH-506695-108', NULL, '14 NGUYỄN DUY . P . 14. Q. 8');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-90', 'DNTN : NAM GiẤY', 'KH-506695-90', NULL, '36 LÊ NiỆM : Q TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-95', 'DNTN : ViỆT NHẬT', 'KH-506695-95', NULL, '10/8KP ĐỒNG AN , P , BÌNH HÒA , TX .THUẬN AN , T BD');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-116', 'DNTN THÀNH THUẬN PHÁT', 'KH-506695-116', NULL, '279 TRẦN NHÂN TÔN .P2 . Q 10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-100', 'DNTN TM DV HOÀNG SƠN', 'KH-506695-100', NULL, '133/2 NGÔ ĐỨC KẾ , P 12 , Q, BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-79', 'NS : BÍCH KIM', 'KH-506694-79', NULL, '49-49 QuỐC LỘ 91, THỊ XÃ CHÂU ĐỐC, TỈNH AN GIANG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-88', 'NS : VĂN LANG', 'KH-506694-88', NULL, '29/7 ĐƯỜNG QUANG TRUNG , P 8 , Q GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-119', 'TRƯỜNG CAO ĐẲNG  GIAO THÔNG VẬN TẢI 3', 'KH-506695-119', NULL, '189 KINH DƯƠNG VƯƠNG . P 13 Q 6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-120', 'VI TINH HOANG MINH', 'KH-506695-120', NULL, '158 B .F      .');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-89', 'VPP : CHỊ THẢO', 'KH-506695-89', NULL, '132 C  PHÙNG HƯNG . Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-130', 'VPP : CHÚ PHÚC', 'KH-506696-130', NULL, '198 A PHÙNG HƯNG , Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-101', 'VPP: ANH HAI ,', 'KH-506695-101', NULL, '240 HẢI THUỢNG LÃN ÔNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-123', 'VPP: ĐĂNG KHOA', 'KH-506695-123', NULL, '123 ĐÀO CAM MỘC . P 4 , Q8');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-124', 'VPP: HƯNG LỢI', 'KH-506695-124', NULL, '149 HẢI THƯỢNG LÃN ÔNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-69', 'VPP: HUYỀN LONG XUYÊN', 'KH-506694-69', NULL, '124 PHÓ ĐỨC CHÍNH , BÌNG KHÁNH 3 ,BÌNH KHÁNH L XUYÊN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-92', 'VPP: KHANH DANH', 'KH-506695-92', NULL, '320 LÝ THÁI TỔ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-114', 'VPP: SAO MỚI', 'KH-506695-114', NULL, 'SÔ 65 ĐƯỜNG SỐ 5 , P11 . Q6');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-117', 'VPP: TÂN SANH', 'KH-506695-117', NULL, 'HẢI THƯỢNG LÃN ÔNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-77', 'VPP: TOÀN HÀ', 'KH-506694-77', NULL, '56 LÊ LỢI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-81', 'VPP: TRANG NHI', 'KH-506694-81', NULL, '97 CƯ XÁ TRẦN QUANG DiỆU , P 14 , Q 3,');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-72', 'CTY : TNHH TM - DV  ĐỖ GIA', '0306139672', NULL, '16/8 KỲ ĐỒNG , P9 , Q 3 - MST : 0306139672');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-160', 'CÔNG TY KIM NGÂN PHÁT', 'KH-506698-160', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-178', 'CTY : SA SINH', 'KH-506700-178', NULL, '56 nguyễn văn thủ , q thuận phước, đà nẵng');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-142', 'CTY CP VPP TRI LUAT', 'KH-506696-142', NULL, '63C-C XA PHU HOA -P 5 -Q 11');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-171', 'CTY ĐỨC HÂN PHÁT', 'KH-506699-171', NULL, '207/56 Hồ Học Lãm ,phường An lạc A ,quận Bình Tân TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-167', 'CTY NAM THÔNG BẢO', 'KH-506699-167', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-169', 'CTY PHẠM NGUYÊN', 'KH-506699-169', NULL, '613 TRẦN ĐẠI NGHĨA');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-133', 'CTY: CO PHAN TAP DOAN & KHOA HOC CONG NGHE', 'KH-506696-133', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-180', 'CTY: ĐĂNG PHONG', 'KH-506700-180', NULL, '16/4D AN BÌNH , Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-191', 'CTY: ĐÔNG HẢI ANH', 'KH-506704-191', NULL, '4/10 VƯỜN LÀI , P TÂN THÀNH , Q TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-190', 'CTY: DŨNG NGUYÊN', 'KH-506703-190', NULL, '263/29A NGUYỄN TRẢI ,P NGUYỄN CƯ TRINH , Q1');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-146', 'CTY: HOA DĂNG', 'KH-506697-146', NULL, '130/8 LÊ DÌNH CẨN ,');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-181', 'CTY: HOÀNG NGUYỄN', 'KH-506700-181', NULL, '282 LÝ THƯỜNG KiỆT, P6 , TP CÀ MAU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-182', 'CTY: JINPACK', 'KH-506700-182', NULL, '78/7A , QuỐC LỘ 1A, PTÂN THỚI NHẤT Q, 12');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-194', 'CTY: KHÔNG GIAN', 'KH-506704-194', NULL, '140 TRẦN QUANG KHẢI , P TÂN ĐỊNH Q 1');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-183', 'CTY: KIÊN THUỶ', 'KH-506700-183', NULL, '7D TRƯƠNG QuỐC DUNG , P8 , Q PHÚ NHUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-192', 'CTY: LONDON', 'KH-506704-192', NULL, '94C CAO THẮNG, P04 ,Q3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-154', 'CTY: LONG VÂN', 'KH-506697-154', NULL, '635 ĐIỆN BIÊN PHỦ , P1 , Q3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-188', 'CTY: MAI ANH', 'KH-506701-188', NULL, '188/2A CAO ĐẠT, P1 Q, Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-179', 'CTY: MẠNH PHÁT', 'KH-506700-179', NULL, 'TẦNG 1.52 ĐÔNG DU , P BẾN NGHÉ, Q1');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-132', 'CTY: NHƯ HƯNG', 'KH-506696-132', NULL, '490/49/36 HƯƠNG LỘ 2 , P BÌNH TRỊ ĐÔNG . Q BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-185', 'CTY: PHẨM ViỆT', 'KH-506701-185', NULL, '42/1 NGUYỄN CỮU ĐÀM , P TÂN SƠN NHÌ , QTPHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506703-189', 'CTY: PHÚ THỊNH', 'KH-506701-189', NULL, 'C5/9A PHẠM HÙNG, HUYỆN BÌNH CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-141', 'CTY: THẢO KHANG', 'KH-506696-141', NULL, '30B TRẦN KHÁNH DƯ ,  PLEIKU, GIA LAI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-187', 'CTY: THỊNH PHÁT ĐẠT', 'KH-506701-187', NULL, '220/4A HOÀNG HOA THÁM , P5 , Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-186', 'CTY: THÔNG MINH', 'KH-506701-186', NULL, '51 NGUYỄN ĐÌNH KIÊN , PTÂN TẠO A, QBÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-193', 'CTY: THUƯỢNG ĐỈNH', 'KH-506704-193', NULL, '94C CAO THẮNG , 04 , Q3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-177', 'CTY: THUỶ TIÊN', 'KH-506700-177', NULL, '98 PHAN VĂN TRỊ , P. 10 Q, GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-139', 'CTY: TNHH ĐĂNG KHOA BAN MÊ', 'KH-506696-139', NULL, '03 THĂNG LONG , BUÔN MA THUỘT');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-136', 'CTY: TNHH ĐÔNG THỊNH PHÁT', 'KH-506696-136', NULL, '002 LÔ E HỒNG LẠC .P10 . Q TÂN BÌNH . TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-134', 'CTY: TNHH IN THIẾT KẾ VÀ TM TOÀN CẦU', 'KH-506696-134', NULL, '32 NGUYỄN DU , QUI NHƠN . BÌNH ĐỊNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-143', 'CTY: TNHH MTV DV SONG MÃ', 'KH-506697-143', NULL, '375B1/8A AN PHÚ TÂY, Q BÌNH CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-138', 'CTY: TNHH MTV KHOA HỌC & CN IGC VIỆT NAM', 'KH-506696-138', NULL, '856 TRẦN HƯNG ĐẠO , P 7 , Q5, ĐC: GAO HÀNG 208 TÊN LỮA');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-151', 'CTY: TNHH MTV SX TM & DV NHẬT VŨ', 'KH-506697-151', NULL, '034 B NGUYỄN THÁI HỌC , P2, THỊ XÃ TÂY NINH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-153', 'CTY: TNHH TRẦN VINH', 'KH-506697-153', NULL, '225 BA CU , P4 , TP VŨNG TÀU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506701-184', 'CTY: TRƯƠNG HOÀN MỸ', 'KH-506701-184', NULL, '159/1/17 TRẦN VĂN ĐANG, P11 ,Q3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-148', 'CTY: VĂN HÙNG', 'KH-506697-148', NULL, '66 PHAN ĐÌNH PHÙNG , NHA TRANG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-135', 'CTY:CỔ PHẨN TM DV QUẢNG CÁO AN HƯNG', 'KH-506696-135', NULL, '211 NGÔ TẤT TỐ , P 22 , Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-173', 'CỬA HÀNG  NGỌC TUYỀN', 'KH-506699-173', NULL, '151 HẢI THƯỢNG LÃN ÔNG, P13, Q 5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-172', 'CỬA HÀNG MINH PHƯƠNG', 'KH-506699-172', NULL, '48 MAI XUÂN THƯỞNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-152', 'CỬA HÀNG VĂN HOÁ TỔNG HỢP NGỌC HÂN', 'KH-506697-152', NULL, 'K 4 LÝ THƯỜNG KIỆT , TP BUÔN MA THUỘT');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-147', 'DNTN : NAM THẠNH', 'KH-506697-147', NULL, '82 B , TRƯNG TRẮC - PHAN THIẾT , BÌNH THUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-158', 'DNTN TM &DV VẠN KIM', 'KH-506698-158', NULL, '250/38A KP2, P.THỐNG NHẤT, BIÊN HÒA, ĐỒNG NAI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-170', 'DTY TNHH TM DV PT QUỐC HOÀNG', 'KH-506699-170', NULL, '1/7 ĐƯỜNG DÂN CHỦ, P.TÂN THÀNH, Q.TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-165', 'KIM KIẾN THÀNH', 'KH-506698-165', NULL, '178/33--ĐƯỜNG 3/2, P.HƯNG LỢI, Q.NINH KIỀU,TP.CẦN THƠ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-163', 'KIM THƯ', 'KH-506698-163', NULL, '34 NGÔ SĨ LIÊN -PHAN THIẾT-BÌNH THUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-162', 'Long- bình tiên', 'KH-506698-162', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-137', 'NS : TÂN HƯNG ( LÀNG VĂN)', 'KH-506696-137', NULL, '3/44Đ LÊ ĐỨC THỌ , F15 , Q GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-176', 'PHOTO -DƯỜNG SỐ 1', 'KH-506705-216', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-166', 'THU THẢO', 'KH-506699-166', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-161', 'VĂN HÙNG - (NHA TRANG)', 'KH-506698-161', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-175', 'VPP 125 LÊ LỢI', 'KH-506700-175', NULL, '125 LÊ LỢI, P.BẾN THÀNH , Q 1');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-159', 'VPP 2-9', 'KH-506698-159', NULL, '….TRAN HUNG DAO,LONG XUYEN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-164', 'VPP.CẨM THÀNH', 'KH-506698-164', NULL, '122 HOÀNG VĂN THỤ- NHA TRANG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-144', 'VPP: CỦ CHI', 'KH-506697-144', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-157', 'VPP: HIỀN', 'KH-506698-157', NULL, '1023 NGUYỄN TRÃI , Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-149', 'VPP: HUƯƠNG', 'KH-506697-149', NULL, '133 PHÙNG HƯNG , Q5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-145', 'VPP: MỸ LIÊN', 'KH-506697-145', NULL, '214 HẢI THƯỢNG LÃN ÔNG , P14, Q5 , TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-155', 'VPP: TRẦN PHÚ', 'KH-506697-155', NULL, '39 TRẦN PHÚ , PLEIKU , GIA LAI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-140', 'VPP: VĨ HÙNG', 'KH-506696-140', NULL, '205 HẢI THƯỢNG LÃN ÔNG , P13 , Q 5');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506696-131', 'VPP:4 GIA HÒA', 'KH-506696-131', NULL, 'ĐỒNG NAI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506699-168', 'CÔNG TY GIẤY KHẢI HOÀNG', 'KH-506699-168', NULL, '33/8/19A PHẠM VĂN CHIÊU, P14, Q.GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-247', 'CTY  TNHH IN PAXA VIET NAM', 'KH-506707-247', NULL, '118/22 LÊ VĂN THỌ , P .11 , Q. GO VÂP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-229', 'CTY : cổ phần tư vấn -sx - tm- dv -DƯỜNG ViỆT', 'KH-506705-229', NULL, '27 đường số 6, KDC thăng long, P. bình trị đông B , Q. bình tân');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-241', 'CTY : KIM HOÀN VŨ', 'KH-506707-241', NULL, 'ĐC ;100 ĐƯỜNG A4 P 12, Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-222', 'CTY : KIM HOÀN VỦ', 'KH-506705-222', NULL, 'ĐC: 100 ĐƯỜNG A4 , P 12, Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-239', 'CTY : PHƯƠNG NGUYÊN', 'KH-506707-239', NULL, '137/30 GÒ DẦU , P TÂN QUÝ , Q TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-221', 'CTY : THANG LOI SAI GO', 'KH-506705-221', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-238', 'CTY : THIÊN PHÚC PHÚ QUỐC', 'KH-506706-238', NULL, 'Tổ 4, ấp cây thông ngoài,xã cửa dương, thành phố phú quốc, t kiên giang.');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-228', 'CTY : THU TRANG', 'KH-506705-228', NULL, '45 ĐƯỜNG D1, F .TÂN HƯNG , Q7');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-231', 'CTY : TNHH SẢN XUẤT TM DV XNK  Giang Đông', 'KH-506706-231', NULL, '108 Trần Đình Xu , P nguyễn cư trinh ,Q 1 , tphcm');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-227', 'CTY : TNHH SX - TM MINH KHA', 'KH-506705-227', NULL, '110/43/51 BÀ HOM , P 13 , Q. 6 , TP.HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-232', 'CTY ĐÔNG THỊNH PHÁT', 'KH-506706-232', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-234', 'CTY TÂN PHƯƠNG HƯNG', 'KH-506706-236', NULL, 'số 22 đường XL 13. tổ 3, ấp hóa nhậ,.xã tân vĩnh hiệp, bình dương');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-244', 'cty thhh 01 thành viên hong hyun yuma', 'KH-506707-244', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-245', 'CTY TNHH - MTV NAM ĐÔNG', 'KH-506707-245', NULL, '24 phú thuận , phường phú thuận quận 7 , tp hcm');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-217', 'CTY TNHH ĐẦU TƯ VÀ PHÁT TRIỄN LÊ PHONG', 'KH-506705-217', NULL, '26/11 Khu Phố Tây A, P Đông Hòa, Thành Phố Dĩ An, Tỉnh Bình Dương');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-254', 'cty tnhh dv thiết kế in ấn Ngọc Tâm', 'KH-506708-254', NULL, '170 lê đức thọ, p 6.q Gò Vấp TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-211', 'CTY TNHH HƯNG GIA LONG', 'KH-506705-211', NULL, '893B PHẠM VĂN THUẬN ,KP3- TAM HiỆP , BIÊN HOÀ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-237', 'cty tnhh tam vinh phat', 'KH-506706-237', NULL, '58 phùng tá ch');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-243', 'cty tnhh thuong mai - dich vu đinh thư', 'KH-506707-243', NULL, '239 vo công tồn kp3, tt bến lức , huyện bến lức , tỉnh long an');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-246', 'CTY tnhh thuương mại dịch vụ văn phòng phẩm fast', 'KH-506707-246', NULL, '600/2/18 đưởng hồng bàng , P. 16 , Q.11 , TP. HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-248', 'Cty TNHH TK MT Và Tin Học Huynh Đệ Anh Khoa', 'KH-506707-248', NULL, '409/16 Nguyễn Trọng Tuyển, P2, QTân Bình, tp . Hcm');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-253', 'CTY TNHH VPP HÙNG PHÁT', 'KH-506707-253', NULL, '14L phạm văn chí , P.7 , Q. 6, TP.HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-230', 'CTY: AN PHÁT THỊNH', 'KH-506706-230', NULL, '269 PHAN ANH , P. BÌNH TRỊ ĐÔNG , Q. BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-201', 'CTY: BẮC MỸ', 'KH-506704-201', NULL, '104 CAO THẮNG , P 4 , 3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-202', 'CTY: CHÂU LÊ', 'KH-506704-202', NULL, 'C5/9A PHẠM HÙNG, HUYỆN BÌNH CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-195', 'CTY: CHÍ TuẤN ĐẠT', 'KH-506704-195', NULL, '51 NGUYỄN ĐÌNH KIÊN , PTÂN TẠO A, QBÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-223', 'CTY: ĐẠI LỢI PHÁT', 'KH-506705-223', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-213', 'CTY: ĐỨC LONG', 'KH-506705-213', NULL, '24 DƯỜNG 26 , KHO PHỐ 7 , P , LINH ĐÔNG , Q THỦ ĐỨC');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-219', 'CTY: DUNG NHI', 'KH-506705-219', NULL, '1.21 LÔ G. KHU MiẾU NỔI. VŨ HUY TuẤN . P.3 Q. BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-200', 'CTY: GIAO TiẾP QuỐC TẾ', 'KH-506704-200', NULL, '104 CAO THẮNG , P 4 , 3');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-199', 'CTY: IN DAKLAK', 'KH-506704-199', NULL, '45 NGUYỄN TẤT THÀNH , P TÂN AN ,TP BUÔN MA THUỘC');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-204', 'CTY: KHANG TuẤN', 'KH-506704-204', NULL, '11/1 NGUYỄN KHOÁI , P1 , Q4 ,TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-198', 'CTY: NGUYỄN THÀNH', 'KH-506705-214', NULL, '357 TÔN ĐẢNG , P 15, Q 4');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-203', 'CTY: PHÚC THỊNH', 'KH-506704-203', NULL, '292/33/5 BÌNH LỢI , P13 ,Q BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-210', 'CTY: PHƯỚC SƠN PHÁT', 'KH-506704-210', NULL, '450/28K DƯƠNG BÁ TRẠC, P 1 , Q8');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-207', 'CTY: QuỐC TOÀN PHÁT', 'KH-506704-207', NULL, '108 LÊ CÔNG PHÉP , P. AN LẠC A , Q .BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-197', 'CTY: THÀNH ĐẠI PHÁT', 'KH-506704-197', NULL, '98/16/3 ĐƯỜNG TÂY THẠNH ,PTÂY THẠNH , QTPHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-215', 'CTY: THANH VÂN', 'KH-506705-215', NULL, '47/10 ĐƯỜNG NGUYỄN VĂN SĂNG , P.TSN, Q TPHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-233', 'CTY: THHH HOÀN LINH KHÔI', 'KH-506706-233', NULL, '33 TRƯƠNG CÔNG ĐỊNH , P. 14 , Q .TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-196', 'CTY: THIÊN ÂN', 'KH-506704-196', NULL, '315 LÝ THÁI TỔ ,P9 , Q10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-212', 'CTY: THUẬN GIAO', 'KH-506705-212', NULL, '355/26 NGUYỄN TRỌNG TUYỂN , P1 , Q TÂN BÌNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-209', 'CTY: THUẬN PHÁT', 'KH-506704-209', NULL, '170 BÀ HẠT , P9 , Q10');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-225', 'CTY: TNHH IN BAO BI ANPHA', 'KH-506705-225', NULL, '215/6 NGUYỄN VĂN LUÔNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-242', 'CTY: TNHH MTV- ĐỨC HÂN PHÁT', 'KH-506707-242', NULL, '115/20/AB LÊ TRỌNG TẤN , P . SƠN KỲ , Q. TÂN PHÚ');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-206', 'CTY: TNHH SX-Giấy Văn Phòng Phẩm Hoa Sen', 'KH-506704-206', NULL, '160/78 Phan Huy ích, Phường 12, Quận Gò Vấp ,TP hồ chí minh,');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-224', 'CTY: TNHH SX TM DV LỘC GIA PHÁT', 'KH-506705-224', NULL, 'M5 CƯ XÁ PHÚ LÂM C, ĐỖ NĂNG TẾ , P. A LẠC A , Q. BÌNH TÂN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-220', 'CTY: TNHH TM DV VPP QUANG LÂM', 'KH-506705-220', NULL, 'SỐ7 , DƯƠNG ĐÌNH NGHỆ , P.8 , Q.11 , TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-250', 'CY TNHH DỊCH VỤ IN VĂN HOÁ', 'KH-506707-250', NULL, '85/6/2  cách mạng tháng tám , P. 12, Q. 10 , TP. HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-205', 'HƯNG GIA LONG', 'KH-506704-205', NULL, '9/1 A PHAN BỘI CHÂU , P2 , BÌNH THẠNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-226', 'PHOTO : HÀ HUY', 'KH-506705-226', NULL, '596 KINH DƯƠNG VƯƠNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-251', 'VPP MiỀN ĐÔNG', 'KH-506707-251', NULL, '109 Ỷ LAN , P PHÚ THẠNH, THÀNH PHỐ HỒ CHÍ MINH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506705-218', 'VPP SÀI GÒN', 'KH-506705-218', NULL, '77/6 Khu Phố 4 ,Đường Trần Xuân Soạn , P Tân Hưng Q7, tp  .hcm');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-240', 'VPP: THU HƯƠNG', 'KH-506707-240', NULL, '521 KINH DƯƠNG VƯƠNG');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506704-208', 'VPP: TOÀN PHÁT', 'KH-506704-208', NULL, 'HỒ DỨC AN - GIA LAI');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-252', 'BÁN LẺ', 'KH-506707-252', NULL, NULL);
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-106', 'ANH THỌ', 'KH-506695-106', NULL, '27 CAO VĂN LẦU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-27', 'C TY  CỔ PHẦN 365', 'KH-506694-27', NULL, '1A NHIÊU TỨ PHÚ NHUẬN');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506700-174', 'CHÂU PHONG', 'KH-506700-174', NULL, '413 A CỘNG HÒA');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506698-156', 'CƠ SỞ :  TRUNG HIẾU', 'KH-506698-156', NULL, '357 D1 , ĐƯỜNG NGUYỄN VĂN TƯ , P7 , THỊ XÃ BẾN TRE');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506707-249', 'Công Ty TNHH Sản Xuất In Ấn Bao Bì LUGIFA', 'KH-506707-249', NULL, '35 Đường Số 1- KDC Hai Thành.Phường Tân Tạo,TP Hồ Chí Minh');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-256', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ GiẤY PHƯƠNG NAM PHÁT', 'KH-506708-256', NULL, 'Số 42 lô A1,khu phố Tân Triều,thành phố Đồng Nai ,Việt nam');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-258', 'CÔNG TY TNHH TM DV HƯNG GIA LONG', 'KH-506708-258', NULL, '79/4 Đường số 4, Phường Bình Hưng Hòa, TP Hồ Chí Minh, Việt Nam.');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-259', 'Công ty TNHH văn phòng phẩm THẢO NGUYÊN', 'KH-506708-259', NULL, '18 PHÓ CƠ ĐiỀU');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-257', 'CTY LÂM SONG MINH', 'KH-506708-257', NULL, '193/18 Nam Kỳ Khởi Nghĩa');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-29', 'CTY TNHH MTV TM DV XNK HuỲNH GIA', 'KH-506694-29', NULL, '58 ĐƯỜNG SỐ 5 XÃ BÌNH HƯNG - BÌNH CHÁNH');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506708-255', 'CTY TNHH TM & XNK TRẦN NGUYỄN TNECHO', 'KH-506708-255', NULL, '44 đường 8B ,KDC Đại Phúc,Green Villas Phạm Hùng xã Bình Hưng TP HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-118', 'CTY:  TNHH MTV - SX - TM TÂN VY PHÁT', 'KH-506695-118', NULL, '1/6 KHU PHỐ 4 . PHAN VĂN HỚN .P TÂN THỚI NHẤT Q . 12');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506706-235', 'CTY: CỔ PHẦN GIẤY AN PHÁT THỊNH', 'KH-506706-235', NULL, '51/3 Đường Số 18 B,Khu Phố 1, Phường Bình Hưng Hòa A, Quận Bình Tân, Tp.hcm');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506697-150', 'CTY: TNHH ĐẦU TƯ THƯƠNG MẠI DỊCH VỤ BẢO ANH', 'KH-506697-150', NULL, 'PHÒNG 1901, LẦU 19, 37 TÔN ĐỨC THẮNG , P BẾN NGHÉ, Q1 HCM');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506695-113', 'NHÀ XUẤT BẢN- ĐẠI HỌC CÔNG NGHIÊP', 'KH-506695-113', NULL, 'SỐ 12 . NGUYỄN VĂN BẢO .4 Q. GÒ VẤP');
INSERT INTO public.customers (id, name, tax_code, phone, address) VALUES ('cus-1790956506694-47', 'VĂN PHÒNG PHẨM . QUA MẠNG', 'KH-506694-47', NULL, '343/16 SƯ VẠN HẠNH P .12 Q .10');

-- Suppliers
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-15', 'CÔNG TY TNHH BÁCH HOÁ TỔNG HỢP TRẦN SANG', 'MST-745083-15', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-2', 'CÔNG TY TNHH BIOMASS VIỆT NAM', 'MST-745083-2', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-3', 'CÔNG TY TNHH GIẤY VĂN PHÒNG PHẨM TUẤN HƯNG', 'MST-745083-3', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-4', 'CÔNG TY TNHH KINH DOANH TỔNG HỢP MẠNH HƯNG', 'MST-745083-4', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-5', 'CÔNG TY TNHH MỘT THÀNH VIÊN HUY MINH QUANG', 'MST-745083-5', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-16', 'CÔNG TY TNHH MỘT THÀNH VIÊN SẢN XUẤT THƯƠNG MẠI TÂN VY PHÁT', 'MST-745083-16', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-17', 'CÔNG TY TNHH MTV SX TM DV THÀNH LỘC', 'MST-745083-17', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-18', 'CÔNG TY TNHH NAM VIỆT 258', 'MST-745083-18', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-19', 'CÔNG TY TNHH SẢN XUẤT GIẤY VĂN PHÒNG PHẨM HOA SEN', 'MST-745083-19', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-6', 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI KIM HOÀN VŨ', 'MST-745083-6', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-7', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGÂN HIỂN', 'MST-745083-7', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-8', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ NGUYÊN BẮC', 'MST-745083-8', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-9', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ PHÁT TRIỂN PHAN LÂM', 'MST-745083-9', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-10', 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ SẢN XUẤT GIẤY KHẢI HOÀN', 'MST-745083-10', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-11', 'CÔNG TY TNHH THƯƠNG MẠI GIẤY VÀ VĂN PHÒNG PHẨM MINH QUÂN', 'MST-745083-11', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-20', 'CÔNG TY TNHH TMDV PHƯỚC HẬU', 'MST-745083-20', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-12', 'CÔNG TY TNHH TƯ VẤN THIẾT KẾ VÀ IN ẤN PIXEL', 'MST-745083-12', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-13', 'CÔNG TY TNHH XUẤT NHẬP KHẨU GIẤY TÂN SANH', 'MST-745083-13', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-14', 'HONGKONG GAINWELL INTERNATIONAL TRADING LIMITED', 'MST-745083-14', NULL, NULL);
INSERT INTO public.suppliers (id, name, tax_code, phone, address) VALUES ('sup-1790957745083-21', 'MONURS CO., LIMITED', 'MST-745083-21', NULL, NULL);

-- Products
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-21', 'NOTE33SN', 'NOTE 3x3 SỌC NGANG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3180.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-22', 'NOTE33TR-4M', 'NOTE 3x3 TRỘN (XL+XD+V+H)', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2352.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-23', 'NOTE33V', 'NOTE 3x3 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 8433.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-35', 'NOTE33V-DQ', 'NOTE 3x3 V-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-24', 'NOTE33XD', 'NOTE 3x3 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3000.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-36', 'NOTE33XD-DQ', 'NOTE 3x3 XD-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 492.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-25', 'NOTE33XL', 'NOTE 3x3 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2208.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-37', 'NOTE33XL-DQ', 'NOTE 3x3 XL-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 108.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-26', 'NOTE34-4M-4L', 'NOTE 3x4 4M-4L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 4224.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-27', 'NOTE34-5M-5L', 'NOTE 3x4 5M-5L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 1392.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-28', 'NOTE34H', 'NOTE 3x4 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 408.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-29', 'NOTE34V', 'NOTE 3x4 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 4752.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-38', 'NOTE34V-DQ', 'NOTE 3x4 V-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 648.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-30', 'NOTE34XD', 'NOTE 3x4 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 2400.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-39', 'NOTE34XD-DQ', 'NOTE 3x4 XD-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 320.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-31', 'NOTE34XL', 'NOTE 3x4 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 444.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-32', 'NOTE35V', 'NOTE 3x5 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-33', 'NOTE-MT-5M', 'NOTE MŨI TÊN 5M NHỰA', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 48960.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-50', 'BIADOUBLEXD', 'BÌA DOUBLE A4 XD', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 36.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-52', 'BIAKIENGA4', 'BÌA KIẾNG A4', 'cat-1790945794265', 'uom-1790945671855', NULL, 1.0000, NULL, 300.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-47', 'BIALA20', 'Bìa Lá 20', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 288.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-48', 'BIALA40', 'Bìa Lá 40', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 324.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-49', 'BIALA60', 'Bìa Lá 60', 'cat-1790945794265', 'uom-1790945686281', NULL, 1.0000, NULL, 29.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-43', 'BIALO400', 'Bìa Lỗ ĐL400', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 13290.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-44', 'BIALO500', 'Bìa Lỗ ĐL500', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 650.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-45', 'BIALO600', 'Bìa Lỗ ĐL600', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 80.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-54', 'BIANUTF4', 'Bìa nút F4', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 7680.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-55', 'BIANUTF4140', 'Bìa nút F4-140', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-56', 'BIANUTF4150', 'Bìa nút F4-150', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-51', 'BIATHAIXANHA4', 'BÌA THÁI XANH A4', 'cat-1790945794265', 'uom-1790945671855', NULL, 1.0000, NULL, 50.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-58', 'DOULBE-A4-70', 'Giấy DoubleA-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-3', 'KEPBUOM19', 'Kẹp bướm 19mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 300.0000, NULL, 40438.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-4', 'KEPBUOM25', 'Kẹp bướm 25mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 240.0000, NULL, 23004.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-5', 'KEPBUOM32', 'Kẹp bướm 32mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 120.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-6', 'KEPBUOM41', 'Kẹp bướm 41mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 120.0000, NULL, 13634.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-7', 'KEPBUOM51', 'Kẹp bướm 51mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 60.0000, NULL, 6660.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-8', 'KEPBUOM-M15', 'Kẹp bướm màu 15mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 1528.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-9', 'KEPBUOM-M19', 'Kẹp bướm màu 19mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 1216.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-10', 'KEPBUOM-M25', 'Kẹp bướm màu 25mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 538.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-11', 'KEPBUOM-M32', 'Kẹp bướm màu 32mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 720.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-12', 'KEPBUOM-M41', 'Kẹp bướm màu 41mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 480.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-13', 'KEPBUOM-M51', 'Kẹp bướm màu 51mm', 'cat-1790939649457', 'uom-1790939575136', NULL, 1.0000, NULL, 550.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-42', 'YIDU-A3-80', 'Nhựa ép YIDU A3-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 110.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-41', 'YIDU-A4-80', 'Nhựa ép YIDU A4-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 200.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-40', 'YIDU-A5-80', 'Nhựa ép YIDU A5-80', 'cat-1790945762757', 'uom-1790945671855', NULL, 1.0000, NULL, 120.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-14', 'NOTE32H', 'NOTE 3x2 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 840.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-15', 'NOTE32V', 'NOTE 3x2 V', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 13440.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-16', 'NOTE32XD', 'NOTE 3x2 XD', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 8400.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-17', 'NOTE32XL', 'NOTE 3x2 XL', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 312.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-19', 'NOTE33-5M-5L', 'NOTE 3x3 5M-5L', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 3744.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-34', 'NOTE33H-DQ', 'NOTE 3x3 H-DQ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 900.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-20', 'NOTE33H', 'NOTE 3x3 HỒNG', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 1668.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-53', 'BIANUTA4', 'Bìa nút A4', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 4800.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-46', 'BIALO700', 'Bìa Lỗ ĐL700', 'cat-1790945775913', 'uom-1790945671855', NULL, 1.0000, NULL, 1008.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-57', 'BIANUTF4682', 'Bìa nút F4-682', 'cat-1790945810944', 'uom-1790945686281', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-59', 'DOULBE-A3-70', 'Giấy DoubleA-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-61', 'DOULBE-A3-80', 'Giấy DoubleA-A3-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-60', 'DOULBE-A4-80', 'Giấy DoubleA-A4-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-62', 'DOULBE-A5-70', 'Giấy DoubleA-A5-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-76', 'GOLDEN-A4-70', 'Giấy GOLDEN-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-66', 'IDEA-A3-70', 'Giấy Idea-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-67', 'IDEA-A3-80', 'Giấy Idea-A3-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-64', 'IDEA-A4-70', 'Giấy Idea-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-65', 'IDEA-A4-80', 'Giấy Idea-A4-80gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-75', 'IKCOPY-A4-70', 'Giấy IKCOPY-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-72', 'OFFICE-A3-70', 'Giấy OFFICE-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-71', 'OFFICE-A4-70', 'Giấy OFFICE-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-70', 'OFFICE-A5-70', 'Giấy OFFICE-A5-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-69', 'QUALITY-A3-70', 'Giấy QUALITY-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-68', 'QUALITY-A4-70', 'Giấy QUALITY-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-74', 'SMARTIST-A3-70', 'Giấy SMARTIST-A3-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-73', 'SMARTIST-A4-70', 'Giấy SMARTIST-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043568-63', 'SUPREME-A4-70', 'Giấy Supreme-A4-70gsm', 'cat-1790945824357', 'uom-1790945680661', NULL, 1.0000, NULL, 0.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-2', 'KEPBUOM15', 'Kẹp bướm 15mm', 'cat-1790939630827', 'uom-1790939575136', 'uom-1790955801503', 360.0000, NULL, 29832.0000, 0, NULL);
INSERT INTO public.products (id, sku, name, category_id, uom_id, alt_uom_id, uom_conversion_rate, description, current_qty, average_cost, image_url) VALUES ('prod-1790946043567-18', 'NOTE33-4MT', 'NOTE 3x3 4M-THẺ', 'cat-1790945744706', 'uom-1790945671855', NULL, 1.0000, NULL, 16080.0000, 0, NULL);

-- Stock Transactions
INSERT INTO public.stock_transactions (id, type, date, warehouse_id, supplier_id, customer_id, reference_no, vat_rate, vat_type, subtotal, vat_amount, total_amount, is_confirmed, is_reversed, reversal_reference, notes, prepaid_amount, prepaid_method, due_date, fiscal_year, is_carry_forward, linked_closing_year) VALUES ('tx-open-2026-wh-1790939712257', 'OPENING', '2026-01-01', 'wh-1790939712257', NULL, NULL, 'SDDK-2026-WH1790939712257', 0.00, 'GROUPED', 0, 0, 0, 1, 0, NULL, 'Tự động ghi nhận tồn đầu kỳ khi Import Excel Hàng hóa', 0, NULL, NULL, 2026, 0, NULL);

-- Stock Transaction Details
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-37', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-41', 200.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-38', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-42', 110.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-39', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-43', 13290.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-40', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-44', 650.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-41', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-45', 80.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-42', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-46', 1008.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-43', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-47', 288.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-44', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-48', 324.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-45', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-49', 29.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-46', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-50', 36.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-47', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-51', 50.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-48', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-52', 300.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-49', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-53', 4800.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-50', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-54', 7680.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-1', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-2', 29832.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-7', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-9', 1216.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-2', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-3', 40438.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-3', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-4', 23004.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-4', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-6', 13634.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-5', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-7', 6660.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-6', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-8', 1528.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-8', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-10', 538.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-9', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-11', 720.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-34', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-38', 648.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-10', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-12', 480.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-11', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-13', 550.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-12', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-14', 840.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-13', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-15', 13440.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-14', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-16', 8400.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-15', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-17', 312.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-16', 'tx-open-2026-wh-1790939712257', 'prod-1790946043567-18', 16080.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-17', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-19', 3744.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-18', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-20', 1668.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-19', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-21', 3180.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-20', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-22', 2352.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-21', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-23', 8433.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-22', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-24', 3000.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-23', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-25', 2208.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-24', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-26', 4224.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-25', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-27', 1392.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-26', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-28', 408.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-27', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-29', 4752.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-28', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-30', 2400.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-29', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-31', 444.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-30', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-33', 48960.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-32', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-36', 492.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-33', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-37', 108.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-31', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-34', 900.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-35', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-39', 320.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);
INSERT INTO public.stock_transaction_details (id, tx_id, product_id, qty, unit_price, total_price, vat_rate, vat_amount, alt_uom_id, alt_qty, alt_unit_price, cogs_unit_cost, cogs_total, carton_qty) VALUES ('txd-open-2026-wh-1790939712257-36', 'tx-open-2026-wh-1790939712257', 'prod-1790946043568-40', 120.0000, 0, 0, 0.00, 0, NULL, NULL, NULL, 0, 0, 0.0000);

-- Webshop Product Configs
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-18', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-19', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-20', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-21', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-71', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-72', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-73', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-74', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-34', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-35', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-36', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-37', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-38', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-25', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-22', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-61', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-62', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-26', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-27', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-28', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-29', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-30', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-63', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-64', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-65', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-66', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-67', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-68', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-69', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-70', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-48', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-49', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-2', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-3', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-4', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-5', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-6', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-7', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-8', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-23', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-24', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-75', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-76', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-32', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-33', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-9', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-10', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-31', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-50', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-51', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-52', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-53', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-54', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-55', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-56', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-57', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-58', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-59', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-60', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-39', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-40', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-41', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-42', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-43', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-44', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-45', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-46', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043568-47', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-11', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-12', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-13', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-14', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-15', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-16', true, 0, NULL, false, NULL, NULL);
INSERT INTO public.webshop_product_configs (product_id, is_published, retail_price, promo_price, is_featured, badge, short_description) VALUES ('prod-1790946043567-17', true, 0, NULL, false, NULL, NULL);
`;

function convertPgToD1Sql() {
  const rawPrefix = fs.readFileSync(path.resolve('drizzle/pg_dump_raw.sql'), 'utf-8');
  const fullRaw = rawPrefix + '\n' + rawUserDump;

  const lines = fullRaw.split('\n');
  const output = [];

  output.push('-- =========================================================================');
  output.push('-- CLOUDFLARE D1 SQL DATA SEED: drizzle/seed_data.sql');
  output.push('-- Dữ liệu đã chuyển đổi từ PostgreSQL Dump sang SQLite D1');
  output.push('-- Chuẩn số nguyên VNĐ, tương thích Cloudflare D1');
  output.push('-- =========================================================================\n');

  // Do not include BEGIN TRANSACTION or COMMIT because Cloudflare D1
  // handles transaction atomicity at the request level and rejects raw transaction statements.

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('--')) {
      if (line.startsWith('-- Data for Name:')) {
        output.push('\n' + line);
      }
      continue;
    }

    if (line.startsWith('INSERT INTO public.')) {
      // 1. Thay thế public.tableName bằng INSERT OR REPLACE INTO tableName
      let converted = line.replace('INSERT INTO public.', 'INSERT OR REPLACE INTO ');

      // 2. Thay thế boolean: , true, hoặc , true) hoặc , false, hoặc , false)
      // Sử dụng regex an toàn cho các giá trị boolean
      converted = converted.replace(/, true([,\)])/g, ', 1$1');
      converted = converted.replace(/, false([,\)])/g, ', 0$1');
      converted = converted.replace(/\(true([,\)])/g, '(1$1');
      converted = converted.replace(/\(false([,\)])/g, '(0$1');

      output.push(converted);
    }
  }

  // Bổ sung dữ liệu vào bảng inventory_stock để khớp chính xác tồn kho của từng sản phẩm trong kho HCM
  output.push('\n-- Đồng bộ tồn kho tức thì vào bảng inventory_stock cho Kho HCM');
  output.push(`
INSERT OR REPLACE INTO inventory_stock (warehouse_id, product_id, quantity, updated_at)
SELECT 
  'wh-1790939712257',
  id,
  current_qty,
  datetime('now')
FROM products;
`);

  // Bổ sung bảng đồng bộ erp_collections
  output.push('\n-- Cập nhật erp_collections JSON Cache');
  output.push(`
INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'products', json_group_array(json_object(
  'id', id, 'sku', sku, 'name', name, 'categoryId', category_id,
  'uomId', uom_id, 'altUomId', alt_uom_id, 'uomConversionRate', uom_conversion_rate,
  'currentQty', current_qty, 'averageCost', average_cost, 'description', coalesce(description, '')
)), '[]', datetime('now') FROM products;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'customers', json_group_array(json_object(
  'id', id, 'name', name, 'taxCode', coalesce(tax_code, ''),
  'phone', coalesce(phone, ''), 'address', coalesce(address, '')
)), '[]', datetime('now') FROM customers;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'suppliers', json_group_array(json_object(
  'id', id, 'name', name, 'taxCode', coalesce(tax_code, ''),
  'phone', coalesce(phone, ''), 'address', coalesce(address, '')
)), '[]', datetime('now') FROM suppliers;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'categories', json_group_array(json_object(
  'id', id, 'name', name, 'description', coalesce(description, '')
)), '[]', datetime('now') FROM categories;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'uoms', json_group_array(json_object(
  'id', id, 'name', name
)), '[]', datetime('now') FROM uoms;

INSERT OR REPLACE INTO erp_collections (key, data, payload, updated_at)
SELECT 'warehouses', json_group_array(json_object(
  'id', id, 'name', name, 'location', coalesce(location, '')
)), '[]', datetime('now') FROM warehouses;
`);

  // End of statements - D1 executes all statements atomically without COMMIT
  const finalSql = output.join('\n');
  fs.writeFileSync(path.resolve('drizzle/seed_data.sql'), finalSql, 'utf-8');
  console.log('Successfully generated drizzle/seed_data.sql. Total bytes:', finalSql.length);
}

convertPgToD1Sql();
