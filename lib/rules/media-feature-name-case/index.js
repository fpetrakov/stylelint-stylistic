const { createPlugin } = require('stylelint')
const atRuleParamIndex = require('stylelint/lib/utils/atRuleParamIndex')
const isCustomMediaQuery = require('stylelint/lib/utils/isCustomMediaQuery')
const isRangeContextMediaFeature = require('stylelint/lib/utils/isRangeContextMediaFeature')
const isStandardSyntaxMediaFeatureName = require('stylelint/lib/utils/isStandardSyntaxMediaFeatureName')
const mediaParser = require('postcss-media-query-parser').default
const rangeContextNodeParser = require('stylelint/lib/rules/rangeContextNodeParser')
const report = require('stylelint/lib/utils/report')
const ruleMessages = require('stylelint/lib/utils/ruleMessages')
const validateOptions = require('stylelint/lib/utils/validateOptions')

const ruleName = 'stylistic/media-feature-name-case'

const messages = ruleMessages(ruleName, {
  expected: (actual, expected) => `Expected "${actual}" to be "${expected}"`,
})

const meta = {
  url: 'https://github.com/elirasza/stylelint-stylistic/tree/main/lib/rules/media-feature-name-case',
  fixable: true,
}

/** @type {import('stylelint').Rule} */
const rule = (primary, _secondaryOptions, context) => (root, result) => {
  const validOptions = validateOptions(result, ruleName, {
    actual: primary,
    possible: ['lower', 'upper'],
  })

  if (!validOptions) {
    return
  }

  root.walkAtRules(/^media$/i, (atRule) => {
    let hasComments = atRule.raws.params && atRule.raws.params.raw
    const mediaRule = hasComments || atRule.params

    mediaParser(mediaRule).walk(/^media-feature$/i, (mediaFeatureNode) => {
      const { parent } = mediaFeatureNode
      const mediaFeatureRangeContext = isRangeContextMediaFeature(parent.value)

      let value
      let sourceIndex

      if (mediaFeatureRangeContext) {
        const parsedRangeContext = rangeContextNodeParser(mediaFeatureNode)

        value = parsedRangeContext.name.value
        sourceIndex = parsedRangeContext.name.sourceIndex
      } else {
        value = mediaFeatureNode.value
        sourceIndex = mediaFeatureNode.sourceIndex
      }

      if (!isStandardSyntaxMediaFeatureName(value) || isCustomMediaQuery(value)) {
        return
      }

      const expectedFeatureName = primary === 'lower' ? value.toLowerCase() : value.toUpperCase()

      if (value === expectedFeatureName) {
        return
      }

      if (context.fix) {
        if (hasComments) {
          hasComments = hasComments.slice(0, sourceIndex)
              + expectedFeatureName
              + hasComments.slice(sourceIndex + expectedFeatureName.length)

          if (atRule.raws.params == null) {
            throw new Error('The `AtRuleRaws` node must have a `params` property')
          }

          atRule.raws.params.raw = hasComments
        } else {
          atRule.params = atRule.params.slice(0, sourceIndex)
              + expectedFeatureName
              + atRule.params.slice(sourceIndex + expectedFeatureName.length)
        }

        return
      }

      report({
        index: atRuleParamIndex(atRule) + sourceIndex,
        message: messages.expected(value, expectedFeatureName),
        node: atRule,
        ruleName,
        result,
      })
    })
  })
}

rule.ruleName = ruleName
rule.messages = messages
rule.meta = meta
module.exports = { messages, meta, plugin: createPlugin(ruleName, rule), rule, ruleName }
