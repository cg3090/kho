/**
 * Utility to convert numeric currency values (VND) to Vietnamese words.
 * Highly compliant with Vietnamese standard accounting printouts.
 */

const mangSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function dochangchuc(so: number, daydu: boolean): string {
  let chuoi = '';
  const chuc = Math.floor(so / 10);
  const donvi = so % 10;
  if (chuc > 1) {
    chuoi = ' ' + mangSo[chuc] + ' mươi';
    if (donvi === 1) {
      chuoi += ' mốt';
    }
  } else if (chuc === 1) {
    chuoi = ' mười';
    if (donvi === 1) {
      chuoi += ' một';
    }
  } else if (daydu && donvi > 0) {
    chuoi = ' lẻ';
  }

  if (donvi === 5 && chuc >= 1) {
    chuoi += ' lăm';
  } else if (donvi > 1 || (donvi === 1 && chuc === 0)) {
    chuoi += ' ' + mangSo[donvi];
  }
  return chuoi;
}

function dochangtram(so: number, daydu: boolean): string {
  let chuoi = '';
  const tram = Math.floor(so / 100);
  const conlai = so % 100;
  if (daydu || tram > 0) {
    chuoi = ' ' + mangSo[tram] + ' trăm';
    chuoi += dochangchuc(conlai, true);
  } else {
    chuoi = dochangchuc(conlai, false);
  }
  return chuoi;
}

function dochangtrieu(so: number, daydu: boolean): string {
  let chuoi = '';
  const trieu = Math.floor(so / 1000000);
  const conlai = so % 1000000;
  if (trieu > 0) {
    chuoi = dochangtram(trieu, daydu) + ' triệu';
    daydu = true;
  }
  const nghin = Math.floor(conlai / 1000);
  const tram = conlai % 1000;
  if (nghin > 0) {
    chuoi += dochangtram(nghin, daydu) + ' nghìn';
    daydu = true;
  }
  if (tram > 0) {
    chuoi += dochangtram(tram, daydu);
  }
  return chuoi;
}

export function numberToWords(soMoney: number): string {
  if (soMoney === 0) return 'Không đồng';
  if (soMoney < 0) return 'Âm ' + numberToWords(Math.abs(soMoney));

  let chuoi = '';
  let hauTo = ' đồng';
  let ty = Math.floor(soMoney / 1000000000);
  let conlai = soMoney % 1000000000;

  if (ty > 0) {
    chuoi = dochangtrieu(ty, false) + ' tỷ';
    while (conlai > 0) {
      ty = Math.floor(conlai / 1000000000);
      let trieu = Math.floor(conlai / 1000000);
      if (trieu > 0) {
        chuoi += dochangtrieu(conlai, true);
        break;
      }
      conlai = conlai % 1000000;
    }
  } else {
    chuoi = dochangtrieu(conlai, false);
  }

  // Capitalize first letter, clean up spaces
  let result = chuoi.trim().replace(/\s+/g, ' ');
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + hauTo;
  }
  return result;
}
