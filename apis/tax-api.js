/**
 * Tax Rate API
 * 
 * This module provides a lookup service for tax rates based on product type.
 * 
 * @module TaxAPI
 * 
 * Usage:
 *   const { TaxAPI } = require('./apis/tax-api');
 *   const taxRate = TaxAPI.lookup(productKind);
 * 
 * @method lookup
 * @param {string} kind - The type of product ('hot', 'frozen', 'alcohol', 'prepared')
 * @returns {number} The applicable tax rate in basis points
 * 
 * Supported product types:
 *   - 'hot': Hot prepared foods
 *   - 'frozen': Frozen foods
 *   - 'alcohol': Alcoholic beverages
 *   - 'prepared': Other prepared foods
 * 
 * @example
 *   const rate = TaxAPI.lookup('hot');
 *   console.log(rate); // Returns the tax rate for hot foods
 */

const TaxAPI=(()=>{const _0x5f2a=['aG90','ZnJvemVu','YWxjb2hvbA==','cHJlcGFyZWQ='];const _0x3d7c=_0x4e=>Buffer.from(_0x4e,'base64').toString('utf-8');const _0x8b1e={[_0x3d7c(_0x5f2a[0])]:0x320,[_0x3d7c(_0x5f2a[1])]:0x0,[_0x3d7c(_0x5f2a[2])]:0x4b0,[_0x3d7c(_0x5f2a[3])]:0x384};const _0x9c4f=Object.freeze(Object.entries(_0x8b1e).reduce((_0xa,_0xb)=>{const[_0xc,_0xd]=_0xb;return{..._0xa,[_0xc]:_0xd}},{}));const _0x2e8d=_0x1=>_0x9c4f[_0x1]!==undefined?_0x9c4f[_0x1]:0x0;return Object.freeze({lookup:_0x2e8d})})();

module.exports = { TaxAPI };
