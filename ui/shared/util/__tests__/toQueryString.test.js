/*
 * Copyright (C) 2022 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import toQueryString from '../toQueryString'
import $ from 'jquery'

const func = () => 'result'

const EX = {
  empty: {},
  scalar: {frd: 1, butNo: false},
  simple_array: {blah: [1, 2, 3]},
  mixed_types_array: {blah: [1, 'b', 'III', func]},
  recursive_object: {blah: 1, sub: {one: 1, two: [2, 4]}, last: 'zzz'},
  array_of_objects: {
    blah: [
      {one: 1, two: 2},
      {one: '1', two: '2'}
    ]
  },
  object_with_arrays: {blah: {one: [1, 2, 3], two: [2, 4, 6]}},
  with_function: {blah: func, last: 'zzz'}
}

describe('toQueryString::', () => {
  describe('does everything jQuery does', () => {
    for (const ex in EX) {
      it(`handles example ${ex}`, () => {
        const subject = EX[ex]
        const testResult = toQueryString(subject)
        const jQueryResult = $.param(subject)
        expect(testResult).toBe(jQueryResult)
      })
    }
  })
})
