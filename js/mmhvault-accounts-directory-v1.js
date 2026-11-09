/* MMHVAULT Accounts Directory V1 — presentation only.
 * Reuses original account rows, event handlers, balance labels and filters.
 * Does NOT read/write localStorage, Supabase, accounts, transactions, FX or balances. */
(() => {
  'use strict';
  if (window.MMHAccountsDirectoryV1) return;
  const ROOT = 'accounts-page';
  const flags = {THB:'🇹🇭',MMK:'🇲🇲',USD:'🇺🇸',AMD:'🇦🇲',CNY:'🇨🇳',EUR:'🇪🇺',JPY:'🇯🇵',SGD:'🇸🇬',HKD:'🇭🇰',INR:'🇮🇳',MYR:'🇲🇾'};
  const names = {THB:['Thai Baht','泰铢','ထိုင်းဘတ်'],MMK:['Myanmar Kyat','缅甸元','မြန်မာကျပ်'],USD:['US Dollar','美元','အမေရိကန်ဒေါ်လာ'],AMD:['Armenian Dram','亚美尼亚德拉姆','အာမေးနီးယားဒရမ်']};
  // Offline default-artwork fallback only. Customer-uploaded logos and custom icons win.
  // Keys are exact synthetic-safe brand+currency+type combinations, never financial account IDs.
  const DEFAULT_BRAND_FALLBACK_ASSETS=Object.freeze({
    "truemoney":"UklGRsIDAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSMUBAAABBrnaNieiMsnB3d2dSip3d/feax5KareOQ8cV6B3wULu7uzvs7mSQZLL1qf6JCAZu28aJ0sM9k2H9BJp+8DT+0Rf7BnzHD/t5YaDzOXPUZuCAgYMGDxk2fMSoToRm2CMVEko0UkM2jXX3Pn76/OWrfQd+3SE0YIFUIcHwqh05vbghpaQEuUhw1Pqp6rKEmjkFMhyUX5xQyQr6LxuliI1DISeohdqi6/vAStJXmtN/OU+rWF61pWbNAbQAWoKwK80BKGRH8uEzcu2ee3dxHw/s4YOH58bfDBXSpN91dhTLUAQtGlH5XAatPUTNEMn5WgWIaZRgJQH8HkG+joRxUGBT25PUAGiyJqyFL7Miy28GA6EOpVz0joBaEnVtMzUDUnk8kQzdWQ39dUcHgip1q3FNIQeUNvp3n8TO9S/7NYw8QZPH9M2ctDVO1uRs+c3J6Rzik1SrZHbuPfpm5yWAkRxpljmi5MveZZ9v77PfReU3UAD4/U/9q2VT9rnDEQaMxRjAYDZuyi3JcIR8vuczkXTfefSwHcB+7Nu7x3ZPJ22srRLDP/eIIkY2ab0/uoWjVh3QsQWhTVtCy9H9okSbpTQ3swZqOgIAVlA4INYBAAAwCwCdASowADAAPpVCm0olo6IhpzgMkLASiWwAxQu+AUeofjpzN/AJg1XA/qvsA+2bfV+YDzsvQBvI/PVfsB8Fn7kEberd8zqTLhGgI/gcOMr/p9YScth/pTjXFZ+Y5rlurAD++iSf//sSn/kPkGckqT8H/6TLjm/BD4i7ibI4Ax/9iPysZ6GNAlZGNGEydPY+b/j9puF7RUP238ZLRi+liNu//TOn+/+6jf/9wbhe8bRZTaVeS8l/HzBAankp31PHT9t98FWE3DdsdxnSZmScS1c0rgYvP6FzhpFl5JrfH/ESIi9f9QIv3//lXNx62/+fj/qK2zx953MYHUsR7wnjXp+fAH2pvxMacNy4yCl9cEueuNYcfwSn6SUQ0uq7AHzXqZ+B7yfyeRs1p84S9i0A5A7bxrL7/Fsg1D1S51AhU4NuQMXPqWtQm+ujyv4O5TV4TIGJeel6/lojZeQo39vtCoz3bZpLb59uESzD/Q9p6ndXPuW+Rbcn4dz0L/829enC525DiOHDU8XNjGySZ6fqqbt8B6W0Exdr8IEeyj6w1LR6hL4O4OEifPcNfJ6LoxeGDudE8uukAfTOo7hxAjKbCe6Xltz/5NFP9RRp+ShnL8UCoAAAAA==",
    "kpay":"UklGRtIEAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSE8BAAABkFtbeyI432jOZmimGhxiLxwxUw3cgVvgiNmOnDEzMw7ol359hoXRP1tAREwAelkUGF5z8tlv8SISgoQgIhJkzCDiv9zYuxAox3HAhkfM/vvwXJRjOMw5S8aoKaPGQL5ahhKAw9w79DHl9/y1CA4oB67TJ5PC59McgD30yajnIQCzPqlaUf2+ANjMmMwG7gDOJEMxnQJeUe0oXwC/mAzzJ1DZqvpQm6vM1R2ouZysM2hH1RTS8VSg5nKzBqpJqIHaVtWHZhJja3e/M2k3dSfdswIac1UGVWtdWtGe1QYm+t8vWz+BN1Q7yifA+RTthHQE2ExDkcuBmZ9UrcT0fBDATnornmsBlOUVehueZ1wJuGLOXXrNp543ZxQOgMO8S2SImkNjIC/OhsP/DuXu18z+apeDw9gOmL313LtWQhAJ/0sQCSJhTGnfnds6GyjQSwBWUDggXAMAALAOAJ0BKjAAMAA+lUicSiWkoqGnOAtosBKJbACdM2h9iUWBJBRtgPMB0F/89vgHPs+xV/f5mu+D/HnJy8C/+AyTL5v/tLYFMn8af1L7A/6nkuvUcRoWj0mIykjVM14ZlWD5o8tVg/+itXir4PgDqSFccFloQ/kIb78P7ZtQAAD++GQXMKVfp5UvNx9UqPzgG9SGcvH7pZDYunDrXrWagjYZfrxz+VJ+3cufMWs2K6eCJ76GxeK7uDx/80Wnvn4r9qwyz+AvpWI4aDwOMGvWvf52ctA/rQ4pOE33ElnhbCH+TfGu7T9vfRIpxVmm8ct2P4PAokir/u1FNfNQVQLps7y3hkTkz7kf/DQwMSukcqJvttfpSGB865fDppLHoHmh+O/2JXR45mQd6DO4LQMUuGGsk7xmB/4Y4aRnpOoIVdSbORvg491O6xJWOjyDnlIxbiIS0MmNSn3qdkb2iPTO6oX+/TKL+MwiIMs8uFYej9qJstxpLS6UV0bZr5N/eq993KhmnJqJvBCMtUygdH+NDa791hCAhb00/YPkVJtnNcdYzCQPVGqe6rWqvz4cgQbVf9zRGbld5e9f0nkN3bXHgsgFS/kb0gVtfwAyXJk+DapfCsKHEXaVhoWC8ka+/CadDLD+OjKq9KF7tPVTXlWqO5a7uyneTJx7f0V5CGmRl//KtWTZfxXJ7jYSK5CogyP5FtlnMGGpXVB8v4TmcyaH0p9nFjqOmr676dvTcqpAo3j1j6v+DHmp7zVkmVouUO0NxeTi72ApKKICKBdxWXh9F5FhQiCTWdZ6Kltz1aXNih3mCuQRRILy9W/vuc/JsqMQ3FDLBpcJi7tCaS5z9rcRtXHF3ic+Hwf9oh7jHPwZv48krOOfO+xETVhAf1nRC+244wAye0jKvyFTnWhb89wf3C41FEHn+GnoNHC3SckhzJMD3SZBzeSVy49HI81d8X/VunjP5UhPdQdCU9R28SjnbhNghDwCDMsYErpwjIlTFOUqXF67d3/v/8yYEV2Ck8r9b2zqJPW2z3geUGc4KXPBldsUCQOKCdOnc1pH9PKPwv51PkUP7yndDe1ghjH6IekmhpU4VVKa7M4J8LV2OA3bdWQIEX6cgDqbo4lj0R+f20OrK/+rQgawYrj0AAAA",
    "okx":"UklGRiACAABXRUJQVlA4WAoAAAAQAAAALwAALwAAQUxQSM8BAAABkHPbtrE9+7nP+7zjK2PbNlrbZpuR7qsyUttW7fS2bVe2nRcP7jnP3cWLP5AmIiYA/1/uDsMojsqG0b06Tf7Ygj0KE2BJXMzLjvpRUpBD8OE/SorJR8Cx2pRDGpLKawgwVlyaJoPbkcLz8BG8YcoQiOlcOefEDW+QUngZ6JZzYjkPvVQjPeNn/ZoXmuhfwNI5DaMwTOiEwxo6Cq97dZ9RLBfD9CTJSwDwkaQrEda2aNOqxaCQtsJ5nKa1XIUALe89fvDo4JDhw4aefPzw8SUgoeVUAKiXK2ngqO7NMYpyJzIeAHiYQ5K9ULZkjsn6plm+QupIFe5CxgPgIfAWpLGk/WHgAbbEC4zXtKo0FS5FAMAzJmsWaGR1gMkYAyS0nA4ADXJVhEWmyloEKD+bJLujbMmiug3r1+sZVhBe7PqLIpyNLJpfunH1xp4JkydOPHTj6s1TJc6FP3/++vXPOeGwhiXXMFxFVUbC60mSFwHgM0kCMZ1jWefEDWtQcsVgIUVdrh96isR62s/6NS800QJAOrqypHJII1J5FVmsoyq/tO9ICs/BR/CGKS1wMLEiNhFrbSKP6zXNaaQn4GdwWOMiN9ePJdTD8OE/1Vh/4v9LAFZQOCAqAAAAMAMAnQEqMAAwAD6VSqFMJaQjIiOIALASiWkAABuBvT4OAAD++HkAAAAA",
    "metamask":"UklGRugEAABXRUJQVlA4WAoAAAAQAAAAJwAAJwAAQUxQSDICAAABoINt22Hbef+Z2fvYtk9lW7GTNpW7lDzsYjupzMqp7FS2bTtZ//e937zFrI0J+oiYAPz3Fljx5A6gSoOTKmDxPaemCqiwW/mOJUCVBqEEpl30ox5CCaT0UpjyNTOBciBlwshd30n8YyoALGXQan2/awSKoj9lCZzwrpQ964QEYL9yBLP09vFAmfqsgB1PS5lk1r0AihdkEQxm6eE16Oe8WyVzNusfpwGrPEgyItzkl88YOWLEiJEjx5/+k2gRdHOaTgYukzG6RFitXz7/4osvvvj8OylHBN2y0fQ4cHdtQZKNoKlPY0TQO392jK5XgNPUjY0I9hkRJP2P3zrOrEuB1R4RXdjoL0naX390nK6jgOEfy7sNuOFm5q7vJwO4XxaMIDmQYNOdWY8DwC51GhEDiwbJjs5pbJczWmTQdFhj7I9qJej1b5MBFHhc1kqYnkcCqrRLuZ2sc1MPUGFPe5egAlLxurwd18e9ALC6ZrTs2t44X7mtrKsA9L4tb8v1wTDgwJrROnUYcKusPdNtwA8122P9DXCLrAV2M90ALPwjOHjdGb/OBnCjcjuMrGsApKVkRHgmfSDuzM6I6CxMQIkH9Hd2NXP/spqe/9YdqIAybZGkty7bfPQ7CuvLqPeO23z525JieSoBFHjkvfM39wAYdbHLupni0tEAerdc8MG9KAAgYUwPgKoogbVPqo66rms9sxEoiwpA76iUGs2qTABShbT7l5xz55d9BaoEIJUV/ucBVlA4IJACAADwDQCdASooACgAPqlKnEqmJCKhqrqsAMAVCWwAnTN2sw+beZFVX67taJiYQG2Y/ZL+q+wD9WvXZ9Ev+V3wDn0PZB/bX0wrumSAe4EeHI1QFqyxoo7YB8Xtgtr1T4PWn+uy6bD9hkazn1EU+3A+bNq18XdY6ZOZ+TAA/ujxDq9kHw0HBJpEih7sookqaqs8upv1qwNENR1cYPt+kdd/t0/cU/PYPXIKmkzF+1F+iqRVIcUh7gk+0vfl9EHnyVoCzWelFaSblL4+X2rv5jTlKkDaI62xTmW54eZI1smwtZW6QP6ueFxLyH/0pJPBw9ig3VhEBfaL5KnO+9cfzfjtQ37OP9R0/uHqIp9B+aBk8r4AJoMRdUc8zGfA3VDdQdlntuVRXHIUfV2OTeVYIruZYvuGB1gGPNq2rb42SlaBNsBENu3a8tF30G9wM5wJm8SfDKbNVdLfi74wq0AQEPoab0jvXLzx1PyaNulXVE17p+j37Pgl2K2dyUoRDHP2Vs8yQTPZ6qV0bRZlnRieIYENrOWqsgk/D+lifdUlCNhJC3+N7kaWOEBodOvLPLT7nFEYqWMVm360NtvHhxD2u8PIfwVXoyLeCXdcegOr7YTj32atah0T9+tpTEkxvMXDOYu5rXik6/hDRdvbdFjXC+z2LDGH8C3Wy8rayh48SZbwynXYH/6wco11BK3KbX19WTMfCZ3/7i5tklp4PPw6+56Y8QBEo0xEtuBpVboqACKVG68ib+ZUfAsnRgSnmYocm4w1+Rzf68ICL8tMQKhHlsf9OBdq4dolblahU+o1/mvRal8wrYiiv5G9WCC9V4eQIrFbt5C///6ugnytktLkg9+k3vLZrjoZXO5U9fTa3/fxR9cAAA==",
    "bybit":"UklGRkgCAABXRUJQVlA4WAoAAAAQAAAAJwAAJwAAQUxQSGcBAAABkKtt2yFJT2G4tq2qWtu2dRaTrpHtRrYZ2bZt27ZV2n6D6qsPYKKImAAKa5oGYGRmG1yLe2TiNXIdpyo0aVQG08hp1LSs28hxGpQHbqlHtcZe48ae54IvSf/2lFmvK1lZzNGj9rEk/ViWa9xWx7NKD390YP0eX5sq/lIBLQMNKi9/24aj0mTuqcvEjTvj1OF1axMVYGr0g4l6U2K39uOlPgKbwwPcUU8o+09NAf5qqNNsjy4YeU90yv/nGQ31ta3b/oYmclc9Tauur85WdiJ5u4rJSElTwE0puQbzlnpCLV8dsBLHdx34/WUUNkf+P8i3cFPB/l0n4+f9uBn1gNq+OqarBQWSYzBfe7Bx9MmCDbpqvFBfqJVBYyNnVqy2sFQHjcTn0kaZU/FDc9qGhkYG//T07lPpWJbNMh3ExlX84O4HaSyASa0g3Y9Q0sfVZcliYbgHG8cPpfjJeEzLNkxq/gzbJwpdAgBWUDggugAAABAFAJ0BKigAKAA+qUyeSyYkIqKnOAyQwBUJQBmqgkpEJmK73VBquNDtXcIO9McY3EAA/vqNxedO9dd88HyzdTS2AM3da8DHpN5jN84BTlbz5/NZR7HgZCrGp4l2S+//nzh9isLvzoSEopw885c4Yn/puU3Lv6HMgmRkAs3IucCAdqmPZDt5S0Yl5/81qLPbZ28+z+h+6RIf4nAHM5tf0HNpSKz+crlwd0IpDTzbjj1wph/FN8gSpYAAAA==",
    "thb":"UklGRjgBAABXRUJQVlA4WAoAAAAQAAAAJwAAJwAAQUxQSEMAAAABYNxGkqLOP9zD7tljvuVnREwA6m8jfjvysRpAq5cCxnXxcCVAPwQoe+iNosPoqLjozegHAa5eGtA5Z9eS6WvrUM8BAFZQOCDOAAAAEAYAnQEqKAAoAD6pSp1KpiQjIaq1XADAFQlqAMzqyrcf4tcPmJdG75cAZ+TWH0/77Xl2gDMT0QIAAP7+ShGmX94s5RsTN9YZmYzfdVnMXudb+zc6vpK6f/44vnOf8m//BtsQT9SvMvovCOte4H5TDP3a1/OppfXxU0G77z6v++L2z8+YuYug+rDEyDfAQcRk9d9rRKZ9R13YAnyG/2w9O/98dyxrV62gy+BAhszCBTdVZysgz/M7QiGpLG3xytAKjTZ0/0CtjipK3puQAAA=",
    "usd":"UklGRowEAABXRUJQVlA4WAoAAAAQAAAAJwAAJwAAQUxQSL4BAAABkG1tmyE7X1VtxDm0kyPbtm3repxz27Zt20627V31f1Gjet9AREwAaqABVOeVaw5euXv38sHVyzsBMHFooOGCHY8+Z+TkFxbm52R8erh9Xn0oHclALbz4M7+0moHVJfk/z88DTASDNtu+55aTlECS5bnfN7eCCWUw9F5WMSnCkCJkcdbtQTAhDCa+yaqmMLKwOuvVGJgAjaFvsoUxu4qMPtD/0Wh9L5uxUfiiCTQApVO2ZVlh/JZblVaAwbwfZfQpzk2DAVT9i3kUH3S8XVsBmPerkp6F0wDo7YUUT5a7AXR4Uk7fwu9tgOXfnDdSFgBr8yjeHFcDZ+mYgBPAE4o/4X3gQzJeJelJMu4DZ+n8OR4HNiRjFbBEmEA3D2j3i+JL+K0VoPbT+rLcBQAzKb5EJgNQde7S+XG8UUsBBjOcEx/i7CQYQGm1ndaH5SZoANBo+pI2PsunjdR/oNEngzYuy589oPF/g5EZtBKHWP4YCoNgg77PKC6aEz7uBYOwBs22CMVKCBErdBsbwyC8BmbeJEkJJMlr0wCNqEqh9ozdXx0D3Zdd02pBKcRoALRfuPr4vVev7h1btaAdAIMaCFZQOCCoAgAAMA4AnQEqKAAoAD6pSJ1KJiQioactsMAVCWwAsR9ogskWudv94AG2O8wH65fqB703or3jveWl/aOHQWcbPoW58vpf0Xepz5GYQfJcFd7o+kEr+XbhykdVdKHa3mK1nYQFy/3G4ZyQHKl7dEmJVTdV3BAg6JiSo+5G8gAA7Q/DnycxkYAWVhp/1HZ25aEFF9zAT4jbqS6NN+n+zzY7Y9svlyfenIYboh8F1IfF4CpR3lk5DUwRonYHtzuYUuSaoL+uglGCEXQwB5bLUm6Ex1wMLsF4sGJYBCtjqYDfhk18jn56bY7gd1/PM/+DP7FofumzALGFMO8lhfSf/+RU7uAPkZyHwBtHzfh+bI6Fih+ET6h9fT57HhOE56UErrSnHrE5dx7oYvCZMghJzDrZ/wUbGN5YMInjbh+AQGw2r3whNFeAT0VeNprCNTdLDPJCO/rqYX/WXP7mC/+Rfg/UoUIw/X/szpLO8srpH9Z7PN/UGZq1fgtaM14MlHybUuH9wyPfTXRFicSrEiNnlLLADvHXr7FuMG+yfbK6dx+gPRvanVzPH+w1kMFMh7Oe+bw4o2J9BZW+izZc3ih4Y2lf+cEwo5UfjBK7xgTx++ZezuuLHLSyoocg8F3KhifhwAFJPOBO832hGpcs5v7ZMzETy4f2ZorTeoKhZ478tTKhd+rWm9wv/c47luypOfGL2+WgJDLNtA/y6M/4GxRvPUr8O+M6HmHGnjG7GKxzqrIHzp39BPytdxy2cwWkSYnIcCSME+Hb1DI2wUJLcyBVCHIFjoq/6suCBzsa0v9qhZljfTwnm0teh4DzD0T8NzFW5qL2wf+CQ4J9uBhsVESs3Oq+692yRx0FzUok+GreczOFFofJYOUvqvoQf8CS2NyT3aLL8glDWxvgsgtPIAA=",
    "amd":"UklGRrYEAABXRUJQVlA4WAoAAAAQAAAAJwAAJwAAQUxQSL4BAAABkG1tmyE7X1VtxDm0kyPbtm3repxz27Zt20627V31f1Gjet9AREwAaqABVOeVaw5euXv38sHVyzsBMHFooOGCHY8+Z+TkFxbm52R8erh9Xn0oHclALbz4M7+0moHVJfk/z88DTASDNtu+55aTlECS5bnfN7eCCWUw9F5WMSnCkCJkcdbtQTAhDCa+yaqmMLKwOuvVGJgAjaFvsoUxu4qMPtD/0Wh9L5uxUfiiCTQApVO2ZVlh/JZblVaAwbwfZfQpzk2DAVT9i3kUH3S8XVsBmPerkp6F0wDo7YUUT5a7AXR4Uk7fwu9tgOXfnDdSFgBr8yjeHFcDZ+mYgBPAE4o/4X3gQzJeJelJMu4DZ+n8OR4HNiRjFbBEmEA3D2j3i+JL+K0VoPbT+rLcBQAzKb5EJgNQde7S+XG8UUsBBjOcEx/i7CQYQGm1ndaH5SZoANBo+pI2PsunjdR/oNEngzYuy589oPF/g5EZtBKHWP4YCoNgg77PKC6aEz7uBYOwBs22CMVKCBErdBsbwyC8BmbeJEkJJMlr0wCNqEqh9ozdXx0D3Zdd02pBKcRoALRfuPr4vVev7h1btaAdAIMaCFZQOCDSAgAAcA8AnQEqKAAoAD6pTJ5MJiQioiOM+MAVCWwAnTM0NefAcWjHb5g1h6nfEA6TvmJ/VX/b/5n3lvQp/1fUA/onUU/sd05HsRfuKwwVuYZl49NQf9XN8zA/nO91n5W8o7k7esiLcd/e6wYqFHKyQHuhSLep0wn8b8u/MBdlQYLnZNIk9oOAAJYQT+ueCJy2m3fg4ImsJdmX5q9tLY/w/GYP5yY4VKOEsLM09/xnnfqiGMthp/7tAYP3YfZst/Bu+HggyTi1a28xgp34e9PPKxMYulg+hsuY5RtqZTep4kq2z5RDkr2LqCGeLfzLP+dcJUzY1Pb6jwf7F6sr2qesLtdDrignAXa1kpbbGntliVM9775X76iwusexuJ2NhVfSnwAcht+zPY2gqc9jJfxodkrpAjJezO32rOUplbEnCAo58C6r5dOC4V4v7yPWuQj4rKEAWq0rJBlD+ROutux2dMVv5rRDT8lYxZKmOFZNKiCK0ryddNXmYyEbRZf1eMT3IBjmK/V+NbST2cD6KHzvvU1DqhcC//3+kkP9j9dhNp1uOEa7j/0j6gSRYHYzf/CDHqsVHzMbpaPiIFL4zXatisy2N8ddqPCAe3PVzierXHiWzGtHsr4sCq7ob6suRfNyFPceGvZ2Rs32T3h5frwgf5FrgBOszdL2WwB86g8VpHJSZLdYjrPmcMuz1IHvTBvB/i6I7gcgk6hXejVlV+hEvIuMyrUtYkdWLyCUgwx7uXCr4BmXGevqP+c2SNSvm2Ey7G/xujcC42MFI3CLTTeCE0x0r0fBUNsl/Bq7faB4ONcyIcn+//+j7EDgSJFbA3HZpKLUA8kU9mLjd9bJSqwObDQapgO4Lc/R1T8ug8McmjPWqhbzPYH2gadlNg7023DW3HLAnxZGe/YBNaOgbglTon64sbvAfcV0L5uxFOw+/toLp85nWj5OaAbN58LRyyGAvee1AAA="
  });
  const BRAND_SIGNATURES=Object.freeze({"truemoney|THB|wallet":"truemoney","baht|THB|cash":"thb","kpay|MMK|wallet":"kpay","kbzpay|MMK|wallet":"kpay","okx|USD|crypto":"okx","metamask|USD|crypto":"metamask","bybit|USD|crypto":"bybit","us dollar|USD|cash":"usd","amd|AMD|cash":"amd"});
  const DEFAULT_ACCOUNT_GLYPHS=Object.freeze({"cash":"💵","wallet":"👛","bank":"🏦","credit":"💳","crypto":"₿","investment":"📈","other":"◈"});
  const labels = {
    directory:['Account directory','账户目录','အကောင့်စာရင်း'],
    currencies:['Currencies','货币分类','ငွေကြေးများ'],
    all:['All accounts','全部账户','အကောင့်အားလုံး'],
    original:['Original balances · Converted totals appear only in the existing summary.','余额保持原币种；汇总金额由原有汇率逻辑换算。','လက်ကျန်များကို မူလငွေကြေးဖြင့် ပြသထားသည်။'],
    account:['Account','账户','အကောင့်'],
    type:['Type','类型','အမျိုးအစား'],
    currency:['Currency','币种','ငွေကြေး'],
    balance:['Balance','余额','လက်ကျန်'],
    accounts:['accounts','个账户',' အကောင့်'],
    units:['currencies','种货币',' ငွေကြေး'],
    noMatch:['No accounts in this currency or search.','此币种或搜索条件下没有账户。','ဤငွေကြေးတွင် အကောင့်မရှိပါ။'],
    choose:['All currencies','全部货币','ငွေကြေးအားလုံး']
  };
  let currency = 'ALL', listObserver = null, currentShell = null, scheduled = false;
  const $ = id => document.getElementById(id);
  function language() {
    const s = String(document.documentElement.lang || 'en').toLowerCase();
    return s.startsWith('zh') ? 1 : s.startsWith('my') || s.startsWith('bur') ? 2 : 0;
  }
  const t = key => (labels[key] || [key])[language()] || key;
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function code(v){ return String(v || '').trim().toUpperCase(); }
  function liveAccounts() {
    try {
      if (typeof MMHVAULT_CONFIG !== 'undefined' && Array.isArray(MMHVAULT_CONFIG.accounts))
        return MMHVAULT_CONFIG.accounts.filter(a => {
          if (!a) return false;
          const f = $('amFilter')?.value || 'all';
          return f === 'archived' ? a.active === false
            : a.active !== false && (f === 'all' || String(a.type) === f);
        });
    } catch (_) { /* read-only fallback below */ }
    return [...($('amList')?.querySelectorAll('.am-row[data-account-id]') || [])].map(row => ({
      id:row.dataset.accountId,
      currency:code(row.querySelector('.am-row-copy small')?.textContent.split('·')[0])
    }));
  }
  function currencyOf(row, byId) {
    if (row.classList.contains('am-portfolio')) return '';
    const a = byId.get(row.dataset.accountId);
    return code(a?.currency || row.querySelector('.am-row-copy small')?.textContent.split('·')[0]);
  }
  function typeOf(row, byId) {
    const a = byId.get(row.dataset.accountId);
    if (a?.type) {
      const map={cash:'Cash',wallet:'Wallet',bank:'Bank',credit:'Credit Card',crypto:'Crypto',investment:'Investment',other:'Other'};
      return map[a.type] || String(a.type);
    }
    return String(row.querySelector('.am-row-copy small')?.textContent.split('·')[1] || '').trim();
  }
  function displayName(c) {
    return (names[c] || [c,c,c])[language()] || c;
  }
  function enhanceBrandFallback(row, account) {
    if (!account || row.classList.contains('am-portfolio')) return;
    const logo=row.querySelector(':scope > .am-logo');
    if (!logo || logo.querySelector('img') || logo.classList.contains('am-directory-default-brand-v1')) return;
    const chosen=String(logo.textContent||'').trim();
    // Never override a user-selected icon or an uploaded image.
    if (chosen!==DEFAULT_ACCOUNT_GLYPHS[account.type]) return;
    const customColor=String(logo.style.getPropertyValue('--am-color')||'').trim().toLowerCase();
    if (customColor && customColor!=='#82bddf') return;
    const signature=[String(account.name||'').trim().toLowerCase(),code(account.currency),String(account.type||'')].join('|');
    const key=BRAND_SIGNATURES[signature];
    if (!key || !DEFAULT_BRAND_FALLBACK_ASSETS[key]) return;
    const img=el('img');
    img.alt=''; img.width=40; img.height=40; img.decoding='async';
    img.src='data:image/webp;base64,'+DEFAULT_BRAND_FALLBACK_ASSETS[key];
    logo.replaceChildren(img);
    logo.classList.add('am-directory-default-brand-v1');
    logo.dataset.brand=key;
  }
  function setCurrency(next) {
    currency = next;
    sync();
  }
  function build() {
    const shell = $('amShell'), home = $('amHome'), heading = document.querySelector('#' + ROOT + ' .ap-heading');
    if (!shell || !home || !heading || !$('amList') || !$('amAdd')) return false;
    if (shell === currentShell) return true;
    if (listObserver) listObserver.disconnect();
    currentShell = shell; currency = 'ALL';
    shell.classList.add('am-directory-ready-v1');
    const actions = el('div','am-directory-heading-actions-v1');
    actions.append($('amAdd'));
    heading.querySelector('.am-directory-heading-actions-v1')?.remove();
    heading.append(actions);
    const oldTop = home.querySelector(':scope > .am-top');
    const summary = home.querySelector(':scope > .am-summary');
    const find = home.querySelector(':scope > .am-find');
    const count = $('amCount'), list = $('amList');
    if (!oldTop || !summary || !find || !count) return false;
    const stats = el('div','am-directory-stats-v1');
    const statAccounts = el('div','am-directory-stat-v1');
    const statCurrencies = el('div','am-directory-stat-v1');
    statAccounts.append(el('strong','am-directory-account-total-v1','0'),el('small','',t('accounts')));
    statCurrencies.append(el('strong','am-directory-currency-total-v1','0'),el('small','',t('units')));
    stats.append(statAccounts,statCurrencies);
    summary.insertBefore(stats,summary.querySelector('.am-summary-grid'));
    const directory = el('div','am-directory-layout-v1');
    const sidebar = el('aside','am-directory-sidebar-v1');
    sidebar.setAttribute('aria-label',t('currencies'));
    sidebar.append(el('h2','am-directory-sidebar-title-v1',t('currencies')));
    const menu = el('nav','am-directory-menu-v1');
    menu.setAttribute('aria-label',t('currencies'));
    sidebar.append(menu,el('p','am-directory-note-v1',t('original')));
    const main = el('section','am-directory-main-v1');
    main.setAttribute('aria-label',t('directory'));
    const head = el('div','am-directory-head-v1');
    const headText = el('div','am-directory-head-text-v1');
    headText.append(el('h2','am-directory-title-v1',t('directory')),el('p','am-directory-visible-v1',''));
    const toolbar = el('div','am-directory-toolbar-v1');
    toolbar.append($('amFilter'));
    head.append(headText,toolbar);
    const columns = el('div','am-directory-columns-v1');
    [t('account'),t('type'),t('currency'),t('balance')].forEach(v => columns.append(el('span','',v)));
    main.append(head,find,columns,count,list);
    directory.append(sidebar,main);
    home.append(directory);
    oldTop.classList.add('am-directory-original-top-v1');
    listObserver = new MutationObserver(() => schedule());
    listObserver.observe(list,{childList:true});
    sync();
    return true;
  }
  function updateMenu(accounts) {
    const menu = document.querySelector('#' + ROOT + ' .am-directory-menu-v1');
    if (!menu) return;
    const counts = new Map();
    accounts.forEach(a => {
      const c=code(a.currency);
      if (c) counts.set(c,(counts.get(c)||0)+1);
    });
    if (currency !== 'ALL' && !counts.has(currency)) currency = 'ALL';
    const ranked = [...counts.keys()].sort((a,b) => {
      const priority=['THB','MMK','USD','AMD'];
      const ai=priority.indexOf(a),bi=priority.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
    });
    const focusedCurrency = document.activeElement?.closest?.('.am-directory-currency-v1')?.dataset?.currency || null;
    menu.replaceChildren();
    function add(codeValue, name, symbol, n) {
      const button=el('button','am-directory-currency-v1');
      button.type='button';
      button.dataset.currency=codeValue;
      button.setAttribute('aria-pressed',String(currency===codeValue));
      button.setAttribute('aria-label',name+' ('+n+')');
      button.append(el('span','am-directory-flag-v1',symbol));
      const text=el('span','am-directory-currency-copy-v1');
      text.append(el('strong','',name),el('small','',codeValue==='ALL'?t('choose'):displayName(codeValue)));
      button.append(text,el('span','am-directory-currency-count-v1',n));
      button.addEventListener('click',() => setCurrency(codeValue));
      menu.append(button);
    }
    add('ALL',t('all'),'◈',accounts.length);
    ranked.forEach(c=>add(c,c,flags[c]||'◉',counts.get(c)));
    if (focusedCurrency) {
      const next = [...menu.querySelectorAll('.am-directory-currency-v1')]
        .find(button=>button.dataset.currency===focusedCurrency);
      (next || menu.querySelector('[aria-pressed="true"]'))?.focus({preventScroll:true});
    }
    document.querySelectorAll('#'+ROOT+' .am-directory-account-total-v1').forEach(n=>n.textContent=String(accounts.length));
    document.querySelectorAll('#'+ROOT+' .am-directory-currency-total-v1').forEach(n=>n.textContent=String(counts.size));
  }
  function sync() {
    if (!currentShell?.isConnected) return;
    const list = $('amList');
    if (!list) return;
    const accounts = liveAccounts(), byId = new Map(accounts.map(a => [String(a.id),a]));
    updateMenu(accounts); // Keep selection and counts consistent before filtering rows.
    const rows=[...list.querySelectorAll(':scope > .am-row')];
    let visibleAccounts=0, visiblePortfolio=0;
    for(const row of rows) {
      const c=currencyOf(row,byId);
      row.dataset.amDirectoryCurrency=c;
      enhanceBrandFallback(row,byId.get(row.dataset.accountId));
      let typeCell=row.querySelector(':scope > .am-directory-type-v1');
      let currencyCell=row.querySelector(':scope > .am-directory-currency-cell-v1');
      if (!typeCell) {typeCell=el('span','am-directory-type-v1'); row.insertBefore(typeCell,row.querySelector('.am-row-value'));}
      if (!currencyCell) {currencyCell=el('span','am-directory-currency-cell-v1');row.insertBefore(currencyCell,row.querySelector('.am-row-value'));}
      const type = row.classList.contains('am-portfolio') ? 'Portfolio' : typeOf(row,byId);
      typeCell.textContent=type;
      currencyCell.textContent=c ? (flags[c] ? flags[c]+' ' : '')+c : '—';
      const show=currency==='ALL' || c===currency;
      row.hidden=!show;
      if(show){if(row.classList.contains('am-portfolio'))visiblePortfolio++;else visibleAccounts++;}
    }
    const count = document.querySelector('#'+ROOT+' .am-directory-visible-v1');
    if(count) count.textContent=String(visibleAccounts)+' '+t('accounts')+(visiblePortfolio?' · '+visiblePortfolio+' portfolio':'')+(currency==='ALL'?'':' · '+currency);
    const empty = list.querySelector(':scope > .am-directory-empty-v1');
    const nativeEmpty = list.querySelector(':scope > .am-help');
    if(nativeEmpty) nativeEmpty.hidden=currency!=='ALL';
    if(!visibleAccounts&&!visiblePortfolio && (rows.length || currency!=='ALL')) {
      if(empty) empty.textContent=t('noMatch');
      else list.append(el('p','am-directory-empty-v1',t('noMatch')));
    } else if(empty) empty.remove();
    const subtitle=document.querySelector('#'+ROOT+' .am-directory-sidebar-title-v1');
    if(subtitle) subtitle.textContent=t('currencies');
    const title=document.querySelector('#'+ROOT+' .am-directory-title-v1');
    if(title) title.textContent=t('directory');
    const note=document.querySelector('#'+ROOT+' .am-directory-note-v1');
    if(note) note.textContent=t('original');
    const cols=document.querySelectorAll('#'+ROOT+' .am-directory-columns-v1 span');
    [t('account'),t('type'),t('currency'),t('balance')].forEach((s,i)=>{if(cols[i])cols[i].textContent=s;});
    for(const item of document.querySelectorAll('#'+ROOT+' .am-directory-stats-v1 small')) item.textContent=item.parentElement.classList.contains('am-directory-stat-v1')&&item.parentElement.firstElementChild.classList.contains('am-directory-account-total-v1')?t('accounts'):t('units');
  }
  function schedule() {
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(() => { scheduled=false; if (!build()) return; sync(); });
  }
  function start() {
    const host = $('apBody');
    if (!host) return;
    new MutationObserver(() => { if($('amShell')!==currentShell) schedule(); }).observe(host,{childList:true});
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    window.addEventListener('languagechange',schedule,{passive:true});
    ['mmhvault:data-loaded','mmhvault:data-change','mmhvault:cache-restored','mmhvault:sync-complete'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
    schedule();
  }
  window.MMHAccountsDirectoryV1={refresh:schedule,setCurrency};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();